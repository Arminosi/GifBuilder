import React from 'react';
import { Monitor } from 'lucide-react';

interface SidebarFooterLinksProps {
  craftWebsiteLabel: string;
  githubRepoLabel: string;
  confirmLabel: string;
  localProcessingLabel: string;
  githubLinkConfirm: boolean;
  onGithubClick: () => void;
}

export const SidebarFooterLinks: React.FC<SidebarFooterLinksProps> = ({
  craftWebsiteLabel,
  githubRepoLabel,
  confirmLabel,
  localProcessingLabel,
  githubLinkConfirm,
  onGithubClick,
}) => (
  <div className="pt-4 border-t border-gray-800 space-y-2">
    <a
      href="https://www.qwq.team"
      target="_blank"
      rel="noopener noreferrer"
      className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/30 hover:border-purple-500/50 text-purple-400 hover:text-purple-300 text-xs font-medium transition-all flex items-center justify-center gap-2"
    >
      <Monitor size={14} />
      {craftWebsiteLabel}
    </a>

    <button
      onClick={onGithubClick}
      className={`w-full px-3 py-2 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${githubLinkConfirm
        ? 'bg-blue-600 border-blue-500 text-white'
        : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-300'
        }`}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
      {githubLinkConfirm ? confirmLabel : githubRepoLabel}
    </button>

    <p className="text-[10px] text-gray-600 px-2 text-center">{localProcessingLabel}</p>
  </div>
);
