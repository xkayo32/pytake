"""
Script para validar e gerar documentação Swagger completa
Execute após atualizar os endpoints
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple


def check_endpoint_documentation(file_path: str) -> Dict[str, any]:
    """
    Verifica se um arquivo de endpoint tem documentação completa
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    issues = []
    warnings = []
    
    # Verificar tags
    if 'tags=["' not in content and 'tags=(' not in content:
        warnings.append("⚠️ Sem tags de agrupamento em router")
    
    # Verificar decoradores @router
    routes = re.findall(r'@router\.\w+\(', content)
    if not routes:
        issues.append("❌ Nenhuma rota encontrada")
        return {"issues": issues, "warnings": warnings, "routes": 0}
    
    # Verificar examples imports
    if 'EXAMPLES' not in content and 'ERRORS' not in content:
        warnings.append("⚠️ Não importa exemplos de swagger_examples")
    
    # Contar endpoints com summary
    summaries = re.findall(r'summary="([^"]+)"', content)
    summary_count = len(summaries)
    
    # Contar endpoints com responses customizadas
    responses = re.findall(r'responses=\{', content)
    response_count = len(responses)
    
    # Contar docstrings
    docstrings = re.findall(r'"""[\s\S]*?"""', content)
    docstring_count = len(docstrings)
    
    return {
        "file": file_path,
        "issues": issues,
        "warnings": warnings,
        "routes_found": len(routes),
        "summaries": summary_count,
        "response_examples": response_count,
        "docstrings": docstring_count,
        "complete": len(issues) == 0 and summary_count > 0 and response_count > 0,
    }


def scan_all_endpoints(base_path: str = "/home/administrator/pytake/backend/app/api/v1/endpoints"):
    """
    Escaneia todos os endpoints e retorna relatório
    """
    endpoints_dir = Path(base_path)
    results = []
    
    for py_file in endpoints_dir.glob("*.py"):
        if py_file.name.startswith("__"):
            continue
        
        result = check_endpoint_documentation(str(py_file))
        results.append(result)
    
    return results


def generate_report(results: List[Dict]) -> str:
    """
    Gera relatório formatado
    """
    report = []
    report.append("=" * 80)
    report.append("📊 SWAGGER DOCUMENTATION STATUS REPORT")
    report.append("=" * 80)
    report.append("")
    
    total_files = len(results)
    complete_files = len([r for r in results if r["complete"]])
    total_routes = sum(r["routes_found"] for r in results)
    total_summaries = sum(r["summaries"] for r in results)
    
    report.append(f"📁 Total Files: {total_files}")
    report.append(f"✅ Fully Documented: {complete_files}/{total_files}")
    report.append(f"📍 Total Routes: {total_routes}")
    report.append(f"📝 Routes with Summary: {total_summaries}/{total_routes}")
    report.append("")
    
    # Groupby status
    complete = [r for r in results if r["complete"]]
    incomplete = [r for r in results if not r["complete"]]
    
    if complete:
        report.append("✅ COMPLETE FILES:")
        report.append("-" * 80)
        for r in complete:
            name = Path(r["file"]).name
            report.append(f"  ✓ {name}")
            report.append(f"    Routes: {r['routes_found']} | Summaries: {r['summaries']} | "
                        f"Responses: {r['response_examples']}")
        report.append("")
    
    if incomplete:
        report.append("🔴 INCOMPLETE FILES:")
        report.append("-" * 80)
        for r in incomplete:
            name = Path(r["file"]).name
            report.append(f"  ✗ {name}")
            if r["issues"]:
                for issue in r["issues"]:
                    report.append(f"    {issue}")
            if r["warnings"]:
                for warning in r["warnings"]:
                    report.append(f"    {warning}")
            report.append(f"    Routes: {r['routes_found']} | Summaries: {r['summaries']} | "
                        f"Responses: {r['response_examples']}")
        report.append("")
    
    report.append("=" * 80)
    report.append("PRIORITY TO DOCUMENT:")
    report.append("-" * 80)
    
    incomplete_sorted = sorted(incomplete, key=lambda x: x["routes_found"], reverse=True)
    for i, r in enumerate(incomplete_sorted, 1):
        name = Path(r["file"]).name
        missing_summaries = r["routes_found"] - r["summaries"]
        missing_responses = r["routes_found"] - r["response_examples"]
        report.append(f"{i}. {name}")
        report.append(f"   - Missing summaries: {missing_summaries}")
        report.append(f"   - Missing response examples: {missing_responses}")
    
    report.append("=" * 80)
    
    return "\n".join(report)


if __name__ == "__main__":
    results = scan_all_endpoints()
    report = generate_report(results)
    print(report)
    
    # Save report
    report_file = "/home/administrator/pytake/backend/SWAGGER_STATUS.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"\n📄 Report saved to: {report_file}")
