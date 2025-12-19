import React from 'react';
import { UserPrompt } from '../types';
import { formatDate } from '../utils/formatters';
import { useI18n } from '../context/i18n';

interface PromptCardProps {
  prompt: UserPrompt;
}

export function PromptCard({ prompt }: PromptCardProps) {
  const { t } = useI18n();
  const date = formatDate(prompt.created_at_epoch);

  return (
    <div className="card prompt-card">
      <div className="card-header">
        <div className="card-header-left">
          <span className="card-type">{t('promptCard.prompt')}</span>
          <span className="card-project">{prompt.project}</span>
        </div>
      </div>
      <div className="card-content">
        {prompt.prompt_text}
      </div>
      <div className="card-meta">
        <span className="meta-date">#{prompt.id} • {date}</span>
      </div>
    </div>
  );
}
