'use client';

import { ExternalLink, Github, Linkedin, Mail } from 'lucide-react';

const developer = {
  name: 'Gopalakrishna Reddy Gogulamudi',
  initials: 'GG',
  links: [
    {
      label: 'Email',
      url: 'mailto:gkr.gogulamudi@gmail.com',
      display: 'gkr.gogulamudi@gmail.com',
      icon: Mail,
    },
    {
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/gopalakrishna-reddy-gogulamudi-22986024b',
      display: 'linkedin.com/in/gopalakrishna-reddy-gogulamudi-22986024b',
      icon: Linkedin,
    },
    {
      label: 'GitHub',
      url: 'https://github.com/krishna070502',
      display: 'github.com/krishna070502',
      icon: Github,
    },
  ],
};

const DeveloperSection = () => {
  return (
    <div className="flex flex-col space-y-6 px-6 py-6">
      <div className="flex items-center space-x-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-light-secondary text-base font-medium text-black dark:bg-dark-secondary dark:text-white">
          {developer.initials}
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-medium text-black dark:text-white">
            {developer.name}
          </p>
          <p className="text-xs text-black/50 dark:text-white/50">
            Developer of LumenAI
          </p>
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        {developer.links.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-xl border border-light-200 bg-light-secondary px-4 py-3 transition-colors hover:bg-light-200 dark:border-dark-200 dark:bg-dark-secondary dark:hover:bg-dark-200"
          >
            <div className="flex min-w-0 items-center space-x-3">
              <link.icon
                size={18}
                className="flex-shrink-0 text-black/70 dark:text-white/70"
              />
              <div className="flex min-w-0 flex-col">
                <span className="text-sm text-black dark:text-white">
                  {link.label}
                </span>
                <span className="truncate text-xs text-black/50 dark:text-white/50">
                  {link.display}
                </span>
              </div>
            </div>
            <ExternalLink
              size={15}
              className="ml-3 flex-shrink-0 text-black/40 group-hover:text-black/70 dark:text-white/40 dark:group-hover:text-white/70"
            />
          </a>
        ))}
      </div>

      <p className="text-xs text-black/40 dark:text-white/40">
        LumenAI v{process.env.NEXT_PUBLIC_VERSION}
      </p>
    </div>
  );
};

export default DeveloperSection;
