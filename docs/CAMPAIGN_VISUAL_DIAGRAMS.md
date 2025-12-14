# 🎯 Campaign Execution System - Visual Diagrams

## 1️⃣ Fluxo Completo (High-Level)

```
USER STARTS CAMPAIGN
        │
        ▼
┌─────────────────────────┐
│  FastAPI Endpoint       │
│  POST /campaigns/{id}/  │
│        start            │
└────────────┬────────────┘
             │ Validates & Updates DB
             ▼
┌─────────────────────────┐
│  CampaignService        │
│  .start_campaign()      │
└────────────┬────────────┘
             │ Enqueues Celery Task
             ▼
      ┌──────────────┐
      │ CELERY QUEUE │
      │   (Redis)    │
      └──────┬───────┘
             │
             ▼ WORKER PICKS UP
┌────────────────────────────────────────────┐
│ CELERY TASK: execute_campaign()            │
│ (PHASE 1: Orchestrator)                    │
│                                            │
│ • Load campaign & WhatsApp number          │
│ • Fetch target contacts (1000)             │
│ • Divide into batches (10 x 100)           │
│ • Create CHORD (parallel + callback)       │
└────────────┬───────────────────────────────┘
             │
    ┌────────┴────────┐
    │ Batches (N jobs in parallel)
    │
    ├─ ┌──────────────────────────┐
    │  │ process_batch[0]         │
    │  │ 100 contacts             │
    │  └──────────────────────────┘
    │
    ├─ ┌──────────────────────────┐
    │  │ process_batch[1]         │
    │  │ 100 contacts             │
    │  └──────────────────────────┘
    │
    ├─ ┌──────────────────────────┐
    │  │ process_batch[N]         │
    │  │ 100 contacts             │
    │  └──────────────────────────┘
    │
    └─────────────┬────────────────
                  │ ALL COMPLETE
                  ▼
    ┌────────────────────────────┐
    │ CALLBACK: finalize_campaign│
    │ • Aggregate stats          │
    │ • Calculate rates          │
    │ • Update final status      │
    └────────────┬───────────────┘
                 │
                 ▼
        ┌────────────────┐
        │ CAMPAIGN STATE │
        │ = COMPLETED    │
        └────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │ Meta Webhooks  │
        │ (Continuous)   │
        │ Status updates │
        │ (delivered,    │
        │  read, etc)    │
        └────────────────┘
```

---

## 2️⃣ Processo de Batch (Detalhado)

```
process_batch(campaign_id, [contact_ids], batch_index)
│
├─ VALIDATE & SETUP
│  ├─ Load campaign
│  ├─ Check if paused/cancelled → Return (skip)
│  ├─ Load WhatsApp number
│  ├─ Initialize rate limiter
│  └─ Load contacts
│
├─ FOR EACH CONTACT:
│  │
│  ├─► CHECK RATE LIMIT
│  │   ├─ can_send_message() → true/false
│  │   │
│  │   └─ If false:
│  │      ├─ wait_time = wait_if_needed()
│  │      │
│  │      ├─ If wait_time > 5 min:
│  │      │  └─ PAUSE CAMPAIGN
│  │      │
│  │      └─ Else:
│  │         └─ await asyncio.sleep(wait_time)
│  │
│  ├─► SEND MESSAGE WITH RETRY
│  │   │
│  │   └─ retry_manager.send_message_with_retry()
│  │      │
│  │      ├─ ATTEMPT 1
│  │      │  ├─ Prepare message (substitute vars)
│  │      │  ├─ Call MetaCloudAPI.send_text_message()
│  │      │  ├─ Save to DB
│  │      │  │
│  │      │  └─► SUCCESS?
│  │      │     └─ Return (true, message_id) ✅
│  │      │     OR
│  │      │     └─ Return (false, error) ❌
│  │      │
│  │      ├─ ATTEMPT 2 (if failed)
│  │      │  ├─ delay = 60 * (2^1) = 120s
│  │      │  ├─ record_attempt(success=false)
│  │      │  ├─ await asyncio.sleep(120)
│  │      │  └─ Retry...
│  │      │
│  │      └─ ATTEMPT 3 (if failed)
│  │         ├─ delay = 60 * (2^2) = 240s
│  │         ├─ record_attempt(success=false)
│  │         ├─ await asyncio.sleep(240)
│  │         ├─ Retry...
│  │         │
│  │         └─► MAX RETRIES REACHED
│  │            └─ Return (false, null) ❌
│  │
│  ├─► UPDATE STATS
│  │   ├─ messages_sent++     (if success)
│  │   ├─ messages_failed++   (if failed)
│  │   ├─ messages_pending--
│  │   └─ error_count++       (if error)
│  │
│  └─► RATE LIMIT DELAY
│      └─ await asyncio.sleep(delay_between_messages)
│         └─ Default: 2 seconds
│
└─ RETURN: {batch_results}
   ├─ sent: N
   ├─ failed: M
   ├─ total: N+M
   └─ status: completed
```

---

## 3️⃣ Retry Logic (Exponential Backoff)

```
FAILED MESSAGE SCENARIO:

┌─────────────────────────────────────────────────────────┐
│ Contact: João Silva (5585988887777)                     │
│ Campaign: Black Friday                                  │
└─────────────────────────────────────────────────────────┘
        │
        ▼ ATTEMPT 1: 2024-12-14 10:00:00
    ┌───────────────────┐
    │ API DOWN ERROR    │
    │ (service unavail) │
    └────────┬──────────┘
             │
             ▼ RECORD FAILURE
      ┌──────────────┐
      │ attempts[0]  │
      │ success:false│
      └──────┬───────┘
             │
             ▼ CALCULATE DELAY
      ┌──────────────────────┐
      │ delay = 60 * (2^0)   │
      │ delay = 60 seconds   │
      └──────┬───────────────┘
             │
             ▼ WAIT
      ⏳ await asyncio.sleep(60)
             │ (2024-12-14 10:01:00)
             ▼
        ┌─────────────────────────────────────────────────────┐
        │ ATTEMPT 2: 2024-12-14 10:01:00                      │
        │ ┌─────────────────────────────────────────────────┐ │
        │ │ API STILL DOWN                                  │ │
        │ │ (temporary service unavail)                     │ │
        │ └─────────────────────────────────────────────────┘ │
        │        │                                             │
        │        ▼ RECORD FAILURE                              │
        │   ┌──────────────┐                                   │
        │   │ attempts[1]  │                                   │
        │   │ success:false│                                   │
        │   └──────┬───────┘                                   │
        │          │                                           │
        │          ▼ CALCULATE DELAY                           │
        │   ┌──────────────────────┐                           │
        │   │ delay = 60 * (2^1)   │                           │
        │   │ delay = 120 seconds  │                           │
        │   └──────┬───────────────┘                           │
        │          │                                           │
        │          ▼ WAIT                                      │
        │   ⏳ await asyncio.sleep(120)                        │
        │          │ (2024-12-14 10:03:00)                     │
        └──────────┼─────────────────────────────────────────┘
                   │
                   ▼
        ┌─────────────────────────────────────────────────────┐
        │ ATTEMPT 3: 2024-12-14 10:03:00                      │
        │ ┌─────────────────────────────────────────────────┐ │
        │ │ SUCCESS! ✅                                     │ │
        │ │ {messages: [{id: "wamid.HBE..."}]}              │ │
        │ └─────────────────────────────────────────────────┘ │
        │        │                                             │
        │        ▼ RECORD SUCCESS                              │
        │   ┌──────────────────┐                               │
        │   │ attempts[2]      │                               │
        │   │ success: true    │                               │
        │   │ message_id: wamid│                               │
        │   └──────┬───────────┘                               │
        │          │                                           │
        │          ▼ RETURN                                    │
        │   ┌──────────────────┐                               │
        │   │ (true, msg_id)   │                               │
        │   └──────┬───────────┘                               │
        │          │                                           │
        │          ▼ UPDATE CAMPAIGN STATS                     │
        │   ┌──────────────────┐                               │
        │   │ messages_sent++  │                               │
        │   └──────────────────┘                               │
        └─────────────────────────────────────────────────────┘

RESULT:
├─ Total attempts: 3
├─ Total time: ~2 minutes
├─ Status: SENT ✅
└─ Message ID: wamid.HBE...
```

---

## 4️⃣ Rate Limiting Strategy

```
RATE LIMITER CHECK (before each send_message)

                    ┌─ Is Official?
                    │  (Meta Cloud API)
                    │
            ┌───────┴───────┐
            │               │
         YES               NO
         (Meta)         (Evolution/QR)
            │               │
            ▼               ▼
    ┌──────────────┐  ┌──────────────┐
    │ Check HARD   │  │ Check SOFT   │
    │ limits:      │  │ limits:      │
    │              │  │              │
    │• Daily: 500  │  │• Min delay:  │
    │• Hour: 100   │  │  500ms       │
    │• Min: 20     │  │• Hour: 1000  │
    └──────┬───────┘  │  (avoidance) │
           │          └──────┬───────┘
           │                 │
      EXCEEDED?         EXCEEDED?
      /      \          /      \
    YES      NO       YES      NO
     │        │        │        │
     ▼        ▼        ▼        ▼
  WAIT   SEND    WAIT    SEND
     │    OK       │     OK
     ▼            ▼
PAUSE            await
  or           sleep(delay)
CONTINUE
  (if < 5min)
```

---

## 5️⃣ Campaign State Machine

```
                    ┌─────────────┐
                    │ DRAFT       │ (Editing allowed)
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    ┌────────┐         ┌─────────┐      ┌────────┐
    │SCHEDULE│         │START →  │      │DELETE  │
    │        │         │ RUNNING │      │(soft)  │
    └────┬───┘         └────┬────┘      └────────┘
         │                  │
    [time passes]       [workers process]
         │                  │
         ▼                  ▼
    ┌────────┐         ┌─────────┐
    │RUNNING │ ◄───────┤ PAUSED  │ (pause) (can resume)
    └────┬───┘         └────┬────┘
         │                  │
    ┌────┴────┬──────┬──────┘
    │          │      │
    │          │      └─ DELETE
    │          │         (soft)
    │          │
    │          └─ CANCEL
    │             (irreversible)
    │
    └─ COMPLETED (after all batches)
       │
       ├─ If 0 failures:
       │  └─ COMPLETED ✅
       │
       └─ If failures > 0:
          └─ COMPLETED_WITH_ERRORS ⚠️
```

---

## 6️⃣ Message Status Lifecycle

```
SINGLE MESSAGE LIFECYCLE

┌──────────────┐
│ pending      │ (before sending)
│              │
│ status: null │
│ message_id   │
│ attempts: [] │
└──────┬───────┘
       │ send_message()
       ▼
┌──────────────┐
│ sent         │ (posted to API)
│              │
│ status: sent │
│ message_id:  │
│   wamid.xxx  │
│ attempts: 1  │
└──────┬───────┘
       │ [webhook] Meta confirms delivery
       ▼
┌──────────────────┐
│ delivered        │ (reached phone)
│                  │
│ status: delivered│
│ message_id: ...  │
│ attempts: 1      │
└──────┬───────────┘
       │ [webhook] User reads
       ▼
┌──────────────┐
│ read         │ (user opened)
│              │
│ status: read │
│ message_id   │
│ attempts: 1  │
└──────────────┘

OR (if fails)

┌──────────────────┐
│ retrying         │ (attempting again)
│                  │
│ status: retrying │
│ message_id: null │
│ attempts: [A,B]  │
└──────┬───────────┘
       │ max retries reached
       ▼
┌──────────────┐
│ failed       │ (final failure)
│              │
│ status: failed│
│ message_id:  │
│ attempts:    │
│  [A,B,C]     │
└──────────────┘
```

---

## 7️⃣ Webhook Status Update Flow

```
Meta Server sends webhook
│
├─ POST /api/v1/webhooks/meta
│
├─ Signature verification
│  └─ X-Hub-Signature-256 validation
│
├─ Extract status update:
│  ├─ message_id: "wamid.HBE..."
│  ├─ status: "delivered|read|failed"
│  ├─ recipient_id: "5585988887777"
│  └─ timestamp: 1702563615
│
├─ Find campaign (by message_id in message_statuses)
│
├─ CampaignRetryManager.update_message_status()
│  │
│  ├─ campaign.message_statuses[contact_id]:
│  │  └─ .status = new_status
│  │
│  ├─ Update counters:
│  │  ├─ If delivered: messages_delivered++
│  │  ├─ If read: messages_read++
│  │  └─ If failed: messages_failed++
│  │
│  ├─ flag_modified(campaign, "message_statuses")
│  │
│  └─ await db.commit()
│
└─ Log: "📝 Updated status for contact: delivered"
```

---

## 8️⃣ Error Tracking Structure

```
CAMPAIGN.ERRORS JSONB Array

[
  {
    "contact_id": "550e8400-...",
    "contact_name": "João Silva",
    "contact_phone": "5585988887777",
    "attempt": 0,
    "error": "Meta API error: Invalid phone number (error_code: 400)",
    "timestamp": "2024-12-14T10:00:00Z"
  },
  {
    "contact_id": "550e8400-...",
    "contact_name": "João Silva",
    "contact_phone": "5585988887777",
    "attempt": 1,
    "error": "Meta API error: Invalid phone number (error_code: 400)",
    "timestamp": "2024-12-14T10:02:00Z"
  },
  {
    "contact_id": "550e8400-...",
    "contact_name": "João Silva",
    "contact_phone": "5585988887777",
    "attempt": 2,
    "error": "Meta API error: Invalid phone number (error_code: 400)",
    "timestamp": "2024-12-14T10:04:40Z"
  },
  ...
]

GROUPED BY CONTACT:
├─ João Silva (3 failures): Invalid phone number
├─ Maria Santos (1 failure): Rate limit exceeded
├─ Pedro Costa (0 failures): SUCCESS
└─ ...
```

---

## 9️⃣ Batch Processing Timeline

```
Timeline for Campaign with 1000 contacts (10 batches, 100 each)

10:00:00  │ Campaign starts
          │ ┌─ Fetch 1000 contacts
          │ ├─ Create 10 batches
          │ └─ Enqueue chord
          │
10:00:05  │ ┌─── Batch[0] starts (contacts 0-99)
          │ ├─── Batch[1] starts (contacts 100-199)
          │ ├─── Batch[2] starts (contacts 200-299)
          │ │... (all in parallel)
          │ └─── Batch[9] starts (contacts 900-999)
          │
10:02:00  │ ✅ Batch[0] completes (98/100 sent, 2 failed)
          │
10:04:00  │ ✅ Batch[1] completes (95/100 sent, 5 failed)
          │
10:06:00  │ ✅ Batch[2] completes (100/100 sent)
          │
...       │ (other batches completing in parallel)
          │
10:45:00  │ ✅ Batch[9] completes
          │ ⏰ ALL BATCHES COMPLETE
          │
10:45:05  │ 🎉 finalize_campaign() callback executes
          │ ├─ Aggregate: 950 sent, 50 failed
          │ ├─ Calculate rates
          │ ├─ Update status → COMPLETED
          │ └─ Log: "Campaign completed"
          │
10:45:05+ │ 📊 Webhooks arrive continuously
          │ ├─ 10:47:00 - 900 delivered
          │ ├─ 11:30:00 - 450 read
          │ └─ ... (over 24-48 hours)
```

---

**Visual Diagrams Complete** ✅  
Última atualização: Dezembro 14, 2025
