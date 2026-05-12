import { Share, Trash, FileText, FileDown } from 'lucide-react';
import { Message } from './ChatWindow';
import { Fragment } from 'react';
import DeleteChat from './DeleteChat';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import jsPDF from 'jspdf';
import { useChat, Section } from '@/lib/hooks/useChat';
import { SourceBlock } from '@/lib/types';

const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};

const exportAsMarkdown = (sections: Section[], title: string) => {
  const date = new Date(
    sections[0].message.createdAt || Date.now(),
  ).toLocaleString();
  let md = `# 💬 Chat Export: ${title}\n\n`;
  md += `*Exported on: ${date}*\n\n---\n`;

  sections.forEach((section, idx) => {
    md += `\n---\n`;
    md += `**🧑 User**  
`;
    md += `*${new Date(section.message.createdAt).toLocaleString()}*\n\n`;
    md += `> ${section.message.query.replace(/\n/g, '\n> ')}\n`;

    if (section.message.responseBlocks.length > 0) {
      md += `\n---\n`;
      md += `**🤖 Assistant**  
`;
      md += `*${new Date(section.message.createdAt).toLocaleString()}*\n\n`;
      md += `> ${section.message.responseBlocks
        .filter((b) => b.type === 'text')
        .map((block) => block.data)
        .join('\n')
        .replace(/\n/g, '\n> ')}\n`;
    }

    const sourceResponseBlock = section.message.responseBlocks.find(
      (block) => block.type === 'source',
    ) as SourceBlock | undefined;

    if (
      sourceResponseBlock &&
      sourceResponseBlock.data &&
      sourceResponseBlock.data.length > 0
    ) {
      md += `\n**Citations:**\n`;
      sourceResponseBlock.data.forEach((src: any, i: number) => {
        const url = src.metadata?.url || '';
        md += `- [${i + 1}] [${url}](${url})\n`;
      });
    }
  });
  md += '\n---\n';
  downloadFile(`${title || 'chat'}.md`, md, 'text/markdown');
};

const exportAsPDF = (sections: Section[], title: string) => {
  const doc = new jsPDF();
  const date = new Date(
    sections[0]?.message?.createdAt || Date.now(),
  ).toLocaleString();
  let y = 15;
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(18);
  doc.text(`Chat Export: ${title}`, 10, y);
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Exported on: ${date}`, 10, y);
  y += 8;
  doc.setDrawColor(200);
  doc.line(10, y, 200, y);
  y += 6;
  doc.setTextColor(30);

  sections.forEach((section, idx) => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 15;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('User', 10, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`${new Date(section.message.createdAt).toLocaleString()}`, 40, y);
    y += 6;
    doc.setTextColor(30);
    doc.setFontSize(12);
    const userLines = doc.splitTextToSize(section.message.query, 180);
    for (let i = 0; i < userLines.length; i++) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 15;
      }
      doc.text(userLines[i], 12, y);
      y += 6;
    }
    y += 6;
    doc.setDrawColor(230);
    if (y > pageHeight - 10) {
      doc.addPage();
      y = 15;
    }
    doc.line(10, y, 200, y);
    y += 4;

    if (section.message.responseBlocks.length > 0) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 15;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Assistant', 10, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(
        `${new Date(section.message.createdAt).toLocaleString()}`,
        40,
        y,
      );
      y += 6;
      doc.setTextColor(30);
      doc.setFontSize(12);
      const assistantLines = doc.splitTextToSize(
        section.parsedTextBlocks.join('\n'),
        180,
      );
      for (let i = 0; i < assistantLines.length; i++) {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 15;
        }
        doc.text(assistantLines[i], 12, y);
        y += 6;
      }

      const sourceResponseBlock = section.message.responseBlocks.find(
        (block) => block.type === 'source',
      ) as SourceBlock | undefined;

      if (
        sourceResponseBlock &&
        sourceResponseBlock.data &&
        sourceResponseBlock.data.length > 0
      ) {
        doc.setFontSize(11);
        doc.setTextColor(80);
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 15;
        }
        doc.text('Citations:', 12, y);
        y += 5;
        sourceResponseBlock.data.forEach((src: any, i: number) => {
          const url = src.metadata?.url || '';
          if (y > pageHeight - 15) {
            doc.addPage();
            y = 15;
          }
          doc.text(`- [${i + 1}] ${url}`, 15, y);
          y += 5;
        });
        doc.setTextColor(30);
      }
      y += 6;
      doc.setDrawColor(230);
      if (y > pageHeight - 10) {
        doc.addPage();
        y = 15;
      }
      doc.line(10, y, 200, y);
      y += 4;
    }
  });
  doc.save(`${title || 'chat'}.pdf`);
};

const Navbar = () => {
  const { sections, chatId, title, isTemporaryChat } = useChat();

  return (
    <div className="fixed top-3 right-3 lg:right-6 z-50 flex items-center gap-2">
      {isTemporaryChat && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-lg shadow-emerald-500/5 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            Incognito
          </span>
        </div>
      )}
      
      <div className="flex items-center gap-1 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20">
        <div
          className="relative"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
          }}
        >
          <div
            className="hidden dark:block absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(30,30,40,0.85) 0%, rgba(20,20,30,0.75) 100%)',
            }}
          />
          <div className="relative flex items-center gap-1 px-2 py-1.5">
            <Popover className="relative">
              <PopoverButton className="p-1.5 rounded-lg hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors duration-200">
                <Share size={15} className="text-black/60 dark:text-white/60" />
              </PopoverButton>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <PopoverPanel className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 shadow-xl shadow-black/10 dark:shadow-black/30 z-50">
                  <div className="p-2">
                    <p className="text-[10px] font-medium text-black/40 dark:text-white/40 uppercase tracking-wide px-2 mb-1">
                      Export
                    </p>
                    <button
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-lg hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors duration-200"
                      onClick={() => exportAsMarkdown(sections, title || '')}
                    >
                      <FileText size={14} className="text-[#24A0ED]" />
                      <span className="text-xs font-medium text-black dark:text-white">Markdown</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-lg hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors duration-200"
                      onClick={() => exportAsPDF(sections, title || '')}
                    >
                      <FileDown size={14} className="text-[#24A0ED]" />
                      <span className="text-xs font-medium text-black dark:text-white">PDF</span>
                    </button>
                  </div>
                </PopoverPanel>
              </Transition>
            </Popover>
            <DeleteChat
              redirect
              chatId={chatId!}
              chats={[]}
              setChats={() => { }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
