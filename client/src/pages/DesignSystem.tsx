import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Icon, type AppIconName } from '../components/ui/Icons';

const DesignSystem: React.FC = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return (
        <div className="page-container space-y-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1>Design System</h1>
                    <p>A reference guide for UI elements and tokens used in Citrux HRMS.</p>
                </div>
                <Button variant="secondary" onClick={toggleTheme}>
                    Toggle Theme ({theme})
                </Button>
            </div>

            {/* Typography Section */}
            <Card>
                <h2 className="border-b pl-4 pb-4 mb-4">Typography</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h1>Heading 1</h1>
                            <h2>Heading 2</h2>
                            <h3>Heading 3</h3>
                            <h4>Heading 4</h4>
                            <h5>Heading 5</h5>
                            <h6>Heading 6</h6>
                        </div>
                        <div className="space-y-2">
                            <p>This is a standard paragraph. It uses the default body text color and font size. Good typography establishes a strong visual hierarchy and makes content easy to read.</p>
                            <p className="text-muted">This is muted text, useful for secondary information or descriptions.</p>
                            <p><span className="font-bold">Bold Text</span> | <span className="font-semibold">Semibold Text</span> | <span className="font-medium">Medium Text</span></p>
                            <p className="text-small">Small text for captions or metadata.</p>
                            <div className="flex gap-2">
                                <span className="text-success">Success Text</span>
                                <span className="text-warning">Warning Text</span>
                                <span className="text-error">Error Text</span>
                                <span className="text-primary">Primary Text</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Colors Section */}
            <Card>
                <h2 className="border-b pl-4 pb-4 mb-4">Colors</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <ColorSwatches />
                </div>
            </Card>

            {/* Buttons Section */}
            <Card>
                <h2 className="border-b pl-4 pb-4 mb-4">Buttons</h2>
                <div className="flex flex-wrap gap-4 items-center">
                    <Button variant="primary">Primary Button</Button>
                    <Button variant="secondary">Secondary Button</Button>
                    <Button variant="success">Success Button</Button>
                    <Button variant="danger">Danger Button</Button>
                    <Button variant="primary" disabled>Disabled</Button>
                </div>
            </Card>

            {/* Form Elements Section */}
            <Card>
                <h2 className="border-b pl-4 pb-4 mb-4">Form Elements</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <Input id="default-input" label="Text Input" placeholder="Enter text here..." />
                        <Input id="email-input" type="email" label="Email Input" placeholder="name@example.com" />
                        <Select
                            id="select-input"
                            label="Select Dropdown"
                            options={['Option 1', 'Option 2', 'Option 3']}
                        />
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="textarea-input" className="block text-sm font-medium text-[var(--text-main)] mb-1">Textarea</label>
                            <textarea id="textarea-input" rows={4} className="input-field" placeholder="Enter description..."></textarea>
                        </div>
                        <div className="flex items-center gap-2 pt-4">
                            <input type="checkbox" id="checkbox-1" />
                            <label htmlFor="checkbox-1" className="!mb-0 cursor-pointer">Checkbox Option</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="radio" name="radio-group" id="radio-1" />
                            <label htmlFor="radio-1" className="!mb-0 cursor-pointer">Radio Option 1</label>
                            <input type="radio" name="radio-group" id="radio-2" className="ml-4" />
                            <label htmlFor="radio-2" className="!mb-0 cursor-pointer">Radio Option 2</label>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Badges Section */}
            <Card>
                <h2 className="border-b pl-4 pb-4 mb-4">Badges</h2>
                <div className="flex flex-wrap gap-4 items-center">
                    <Badge variant="success">Active</Badge>
                    <Badge variant="warning">Pending</Badge>
                    <Badge variant="error">Rejected</Badge>
                    <Badge variant="info">Info</Badge>
                    <Badge>Default</Badge>
                </div>
            </Card>

            {/* Icons Section */}
            <Card>
                <h2 className="border-b pl-4 pb-4 mb-4">HRMS Icon Set</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {(['dashboard', 'employees', 'attendance', 'leaves', 'payroll', 'holidays', 'reports', 'settings', 'profile', 'notifications', 'onboarding', 'roles', 'departments', 'timesheet', 'offboarding', 'performance', 'careers', 'expenses', 'assets', 'team_leaves', 'org_chart', 'approvals', 'certificates', 'reviews', 'ats', 'exp_approvals', 'inventory', 'shifts', 'analytics', 'logout', 'arrow_down', 'light_mode', 'dark_mode', 'chevron_up', 'chevron_down', 'filters', 'chat'] as AppIconName[]).map(icon => (
                        <div key={icon} className="flex flex-col items-center gap-3 p-4 rounded-xl border border-transparent hover:border-[var(--border-color)] hover:bg-[var(--bg-body)] transition-all group">
                            <div className="text-[var(--primary)] group-hover:scale-110 transition-transform">
                                <Icon name={icon} size={32} />
                            </div>
                            <span className="text-xs font-medium text-[var(--text-muted)] truncate w-full text-center">{icon}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Cards & Layouts */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold">Cards & Layouts</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <h3>Simple Card</h3>
                        <p className="text-muted">A basic card component with padding and shadow.</p>
                    </Card>
                    <Card>
                        <h3>Glass Panel</h3>
                        <p className="text-muted">Similar to card but semantically named for transparency effects if configured.</p>
                    </Card>
                    <Card className="border-none bg-blue-50 dark:bg-slate-800">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-muted">Total Users</p>
                                <h2 className="text-3xl font-bold my-2">1,234</h2>
                                <Badge variant="success" className="text-sm">+12% from last month</Badge>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                                <Icon name="info" size={24} />
                            </div>
                        </div>
                    </Card>
                </div>
            </section>

            {/* Patterns Section */}
            <Card>
                <h2 className="border-b pl-4 pb-4 mb-4">Pattern: Wizard Form</h2>
                <div className="space-y-6">
                    <p className="text-muted">Use this pattern for multi-step data entry forms (e.g. Onboarding). It uses a horizontal stepper and a contained Card layout.</p>

                    {/* Visual Example of Stepper */}
                    <div className="bg-[var(--bg-body)] p-4 rounded-lg">
                        <div className="flex items-center justify-between relative px-8">
                            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-[var(--border-color)] -z-10" />
                            {/* Completed Step */}
                            <div className="flex flex-col items-center bg-[var(--bg-body)] px-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[var(--success)] text-white">
                                    ✓
                                </div>
                                <span className="text-xs font-medium mt-2 text-[var(--success)]">Step 1</span>
                            </div>
                            {/* Active Step */}
                            <div className="flex flex-col items-center bg-[var(--bg-body)] px-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[var(--primary)] text-white ring-4 ring-[var(--primary-hover)]/20">
                                    2
                                </div>
                                <span className="text-xs font-medium mt-2 text-[var(--primary)]">Current</span>
                            </div>
                            {/* Pending Step */}
                            <div className="flex flex-col items-center bg-[var(--bg-body)] px-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[var(--bg-surface)] border-2 border-[var(--border-color)] text-[var(--text-muted)]">
                                    3
                                </div>
                                <span className="text-xs font-medium mt-2 text-[var(--text-muted)]">Next</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button variant="secondary" className="justify-center">Back</Button>
                        <Button variant="primary" className="justify-center">Next Step →</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// Helper component to render color swatches
const ColorSwatches = () => {
    const colors = [
        { name: 'Primary', className: 'bg-[var(--primary)]', hex: '#9d316e', var: 'var(--primary)' },
        { name: 'Primary Hover', className: 'bg-[var(--primary-hover)]', hex: '#83275a', var: 'var(--primary-hover)' },
        { name: 'Success', className: 'bg-[var(--success)]', hex: '#10b981', var: 'var(--success)' },
        { name: 'Warning', className: 'bg-[var(--warning)]', hex: '#f59e0b', var: 'var(--warning)' },
        { name: 'Error', className: 'bg-[var(--error)]', hex: '#ef4444', var: 'var(--error)' },
        { name: 'Info', className: 'bg-[var(--info)]', hex: '#3b82f6', var: 'var(--info)' },
        { name: 'Body Bg', className: 'bg-[var(--bg-body)]', hex: '#f3f4f6', var: 'var(--bg-body)' },
        { name: 'Surface Bg', className: 'bg-[var(--bg-surface)]', hex: '#ffffff', var: 'var(--bg-surface)' },
        { name: 'Text Main', className: 'bg-[var(--text-main)]', hex: '#111827', var: 'var(--text-main)' },
        { name: 'Text Muted', className: 'bg-[var(--text-muted)]', hex: '#6b7280', var: 'var(--text-muted)' },
        { name: 'Border', className: 'bg-[var(--border-color)]', hex: '#e5e7eb', var: 'var(--border-color)' },
    ];

    return (
        <>
            {colors.map((c) => (
                <div key={c.name} className="flex flex-col gap-2">
                    <div
                        className={`h-24 w-full rounded-lg shadow-sm border border-gray-200 ${c.className}`}
                        title={c.hex}
                    ></div>
                    <div className="text-xs">
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-slate-500 font-mono">{c.var}</p>
                    </div>
                </div>
            ))}
        </>
    );
};

export default DesignSystem;
