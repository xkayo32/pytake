'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Star } from 'lucide-react';
import { usersAPI } from '@/lib/api';

export interface Skill {
  id?: string;
  skill_name: string;
  proficiency_level: number;
}

interface SkillsEditorProps {
  userId?: string;
  initialSkills?: Skill[];
  onChange?: (skills: Skill[]) => void;
  readOnly?: boolean;
  className?: string;
}

export function SkillsEditor({
  userId,
  initialSkills = [],
  onChange,
  readOnly = false,
  className = '',
}: SkillsEditorProps) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAvailableSkills();
  }, []);

  useEffect(() => {
    setSkills(initialSkills);
  }, [initialSkills]);

  const fetchAvailableSkills = async () => {
    try {
      const response = await usersAPI.getAvailableSkills();
      setAvailableSkills(response.data);
    } catch (error) {
      console.error('Erro ao carregar skills disponíveis:', error);
    }
  };

  const handleAddSkill = (skillName: string, proficiency: number = 3) => {
    const trimmedName = skillName.trim();
    if (!trimmedName) return;

    // Check if skill already exists
    if (skills.some(s => s.skill_name.toLowerCase() === trimmedName.toLowerCase())) {
      return;
    }

    const newSkills = [
      ...skills,
      { skill_name: trimmedName, proficiency_level: proficiency }
    ];

    setSkills(newSkills);
    setNewSkill('');
    setShowSuggestions(false);

    if (onChange) {
      onChange(newSkills);
    }
  };

  const handleRemoveSkill = (index: number) => {
    const newSkills = skills.filter((_, i) => i !== index);
    setSkills(newSkills);

    if (onChange) {
      onChange(newSkills);
    }
  };

  const handleProficiencyChange = (index: number, level: number) => {
    const newSkills = [...skills];
    newSkills[index].proficiency_level = level;
    setSkills(newSkills);

    if (onChange) {
      onChange(newSkills);
    }
  };

  const filteredSuggestions = availableSkills.filter(
    skill =>
      skill.toLowerCase().includes(newSkill.toLowerCase()) &&
      !skills.some(s => s.skill_name.toLowerCase() === skill.toLowerCase())
  );

  const proficiencyLevels = [
    { level: 1, label: 'Iniciante' },
    { level: 2, label: 'Básico' },
    { level: 3, label: 'Intermediário' },
    { level: 4, label: 'Avançado' },
    { level: 5, label: 'Especialista' },
  ];

  const getProficiencyColor = (level: number) => {
    if (level === 1) return 'text-gray-500';
    if (level === 2) return 'text-blue-500';
    if (level === 3) return 'text-green-500';
    if (level === 4) return 'text-orange-500';
    return 'text-yellow-500';
  };

  return (
    <div className={className}>
      {/* Add Skill Input */}
      {!readOnly && (
        <div className="mb-4 relative">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => {
                setNewSkill(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill(newSkill);
                }
              }}
              placeholder="Adicionar nova skill..."
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => handleAddSkill(newSkill)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredSuggestions.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleAddSkill(skill)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  {skill}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Skills List */}
      <div className="space-y-2">
        {skills.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            {readOnly ? 'Nenhuma skill cadastrada' : 'Adicione skills para este agente'}
          </p>
        ) : (
          skills.map((skill, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {skill.skill_name}
                </div>
                {!readOnly ? (
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleProficiencyChange(index, level)}
                        className={`transition-colors ${
                          level <= skill.proficiency_level
                            ? getProficiencyColor(skill.proficiency_level)
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                        title={proficiencyLevels[level - 1].label}
                      >
                        <Star
                          className="w-4 h-4"
                          fill={level <= skill.proficiency_level ? 'currentColor' : 'none'}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {proficiencyLevels[skill.proficiency_level - 1]?.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <Star
                        key={level}
                        className={`w-4 h-4 ${
                          level <= skill.proficiency_level
                            ? getProficiencyColor(skill.proficiency_level)
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                        fill={level <= skill.proficiency_level ? 'currentColor' : 'none'}
                      />
                    ))}
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {proficiencyLevels[skill.proficiency_level - 1]?.label}
                    </span>
                  </div>
                )}
              </div>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(index)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Remover skill"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
