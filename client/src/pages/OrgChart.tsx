import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icons';

interface User {
    id: string;
    email: string;
    role: string;
    managerId: string | null;
    profile?: {
        firstName: string;
        lastName: string;
        designation: string;
        avatarUrl?: string; // Potential future use
    };
}

interface TreeNode {
    user: User;
    children: TreeNode[];
}

const OrgChart: React.FC = () => {
    const { token } = useAuth();
    const [trees, setTrees] = useState<TreeNode[]>([]);
    const [orphans, setOrphans] = useState<TreeNode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const users: User[] = await res.json();
                const { treeRoots, orphanNodes } = buildTree(users);
                setTrees(treeRoots);
                setOrphans(orphanNodes);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const buildTree = (users: User[]): { treeRoots: TreeNode[], orphanNodes: TreeNode[] } => {
        const userMap = new Map<string, TreeNode>();

        // Initialize nodes
        users.forEach(u => {
            userMap.set(u.id, { user: u, children: [] });
        });

        const roots: TreeNode[] = [];

        // Connect relationships
        users.forEach(u => {
            const node = userMap.get(u.id);
            if (node) {
                if (u.managerId && userMap.has(u.managerId)) {
                    userMap.get(u.managerId)?.children.push(node);
                } else {
                    roots.push(node);
                }
            }
        });

        const treeRoots: TreeNode[] = [];
        const orphanNodes: TreeNode[] = [];

        roots.forEach(root => {
            if (root.children.length > 0 || root.user.role === 'CEO' || root.user.role === 'ADMIN') {
                treeRoots.push(root);
            } else {
                orphanNodes.push(root);
            }
        });

        return { treeRoots, orphanNodes };
    };

    const renderNode = (node: TreeNode, isChild: boolean = false) => {
        const initials = node.user.profile?.firstName?.charAt(0) || node.user.email.charAt(0).toUpperCase();

        return (
            <div key={node.user.id} className="tree-node-wrapper">
                {/* Connector line from horizontal bar to child */}
                {isChild && <div className="tree-node-connector-up" />}

                <Card className="w-64 p-5 flex flex-col items-center text-center relative z-10 group hover:border-[var(--primary)] transition-all">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-bold mb-3 border border-indigo-100 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {initials}
                    </div>

                    <h3 className="text-base font-bold text-[var(--text-main)] mb-0.5 truncate w-full">
                        {node.user.profile ? `${node.user.profile.firstName} ${node.user.profile.lastName}` : node.user.email}
                    </h3>

                    <p className="text-xs text-[var(--text-muted)] font-medium mb-3 uppercase tracking-wider">
                        {node.user.profile?.designation || 'Team Member'}
                    </p>

                    <Badge variant={node.user.role === 'CEO' ? 'info' : 'default'} className="text-[10px] py-0 px-2 h-5">
                        {node.user.role}
                    </Badge>

                    {/* Show icon for manager role */}
                    {node.children.length > 0 && (
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-full p-0.5 text-[var(--text-muted)] shadow-sm">
                            <Icon name="arrow_down" size={12} />
                        </div>
                    )}
                </Card>

                {/* Connector down to children container */}
                {node.children.length > 0 && (
                    <>
                        <div className="tree-node-connector-down" />
                        <div className="tree-children-container">
                            {/* Horizontal connector line */}
                            {node.children.length > 1 && (
                                <div
                                    className="tree-children-connector-horizontal"
                                    // eslint-disable-next-line
                                    style={{ '--child-count': node.children.length } as React.CSSProperties}
                                />
                            )}
                            {node.children.map(child => renderNode(child, true))}
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="p-8 min-h-screen bg-[var(--bg-body)] overflow-auto">
            <div className="max-w-[1600px] mx-auto">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[var(--text-main)] mb-2">Organizational Structure</h1>
                        <p className="text-[var(--text-muted)] text-base">Visualize the company hierarchy and reporting lines.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
                            <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                            <span>Hierarchy</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
                            <div className="w-3 h-3 rounded-full bg-[var(--bg-body)] border border-[var(--border-color)]"></div>
                            <span>Unassigned</span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 glass-panel">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)] mb-4"></div>
                        <p className="text-[var(--text-muted)] font-medium">Building organizational map...</p>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {/* Connected Trees */}
                        {trees.length > 0 && (
                            <div className="glass-panel p-0 overflow-auto border-[var(--border-color)]">
                                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-body)]/50">
                                    <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Reporting Hierarchy</h2>
                                </div>
                                <div className="tree-container">
                                    {trees.map(node => renderNode(node))}
                                </div>
                            </div>
                        )}

                        {/* Unassigned / Individual Entries */}
                        {orphans.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <h2 className="text-lg font-bold text-[var(--text-main)]">Unassigned & Individual Contributors</h2>
                                    <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {orphans.map(node => (
                                        <Card key={node.user.id} className="p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                                            <div className="w-12 h-12 rounded-full bg-[var(--bg-body)] text-[var(--text-muted)] flex items-center justify-center font-bold border border-[var(--border-color)] shrink-0">
                                                {node.user.profile?.firstName?.charAt(0) || node.user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-[var(--text-main)] text-sm truncate">
                                                    {node.user.profile ? `${node.user.profile.firstName} ${node.user.profile.lastName}` : node.user.email}
                                                </h3>
                                                <p className="text-xs text-[var(--text-muted)] truncate mb-1">{node.user.profile?.designation || 'Specialist'}</p>
                                                <Badge className="text-[10px] py-0 px-2 h-4">{node.user.role}</Badge>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {trees.length === 0 && orphans.length === 0 && (
                            <div className="text-center py-20 glass-panel">
                                <Icon name="org_chart" size={48} className="mx-auto mb-4 text-[var(--text-muted)] opacity-20" />
                                <p className="text-[var(--text-muted)] font-medium text-lg">No organizational data available.</p>
                                <p className="text-sm text-[var(--text-muted)]">Check back after employees have been added to the system.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrgChart;
