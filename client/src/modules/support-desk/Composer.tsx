import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import type { CommentVisibility } from './types';

interface Props {
    onSubmit: (input: { body: string; visibility?: CommentVisibility; files?: File[] }) => void;
    pending?: boolean;
    /** Agents can post INTERNAL notes; admins ADMIN_ONLY. */
    allowInternal?: boolean;
    allowAdminOnly?: boolean;
    placeholder?: string;
}

export const CommentComposer: React.FC<Props> = ({ onSubmit, pending, allowInternal, allowAdminOnly, placeholder }) => {
    const [body, setBody] = useState('');
    const [visibility, setVisibility] = useState<CommentVisibility>('PUBLIC');
    const [files, setFiles] = useState<File[]>([]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim()) return;
        onSubmit({ body: body.trim(), visibility, files });
        setBody('');
        setFiles([]);
        setVisibility('PUBLIC');
    };

    return (
        <form onSubmit={submit} className="space-y-2">
            <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder={placeholder ?? 'Write a reply…'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                aria-label="Comment body"
            />
            <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                    {(allowInternal || allowAdminOnly) && (
                        <select
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value as CommentVisibility)}
                            className="text-xs px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                            aria-label="Comment visibility"
                        >
                            <option value="PUBLIC">Public reply</option>
                            {allowInternal && <option value="INTERNAL">Internal note</option>}
                            {allowAdminOnly && <option value="ADMIN_ONLY">Admin only</option>}
                        </select>
                    )}
                    <label className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                        📎 Attach
                        <input
                            type="file"
                            multiple
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                        />
                    </label>
                    {files.length > 0 && <span className="text-xs text-slate-400">{files.length} file(s)</span>}
                </div>
                <Button type="submit" disabled={pending || !body.trim()}>{pending ? 'Sending…' : 'Send'}</Button>
            </div>
        </form>
    );
};
