import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface User {
    id: string;
    email: string;
    role: string;
    managerId: string | null;
    profile?: {
        firstName: string;
        lastName: string;
        designation: string;
        documents?: string; // stored as JSON string in DB, but we won't need full docs here, maybe just avatar? 
        // Actually profile doesn't have avatarUrl field in schema usually, let's check schema again if needed.
        // Schema has 'documents' string? No, 'profile' usually has avatar? 
        // Actually we used gravatar or initial in Users.tsx. 
        // Let's assume no avatar field in profile for now, use initials.
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

        // Split roots into Trees (roots with children) and Orphans (roots without children)
        // Note: A CEO with no manager is a Tree Root. An Isolated employee is an Orphan.
        // Heuristic: If it has children -> Tree. If it has NO children -> Orphan.
        // Exception: If there is ONLY one person in the company (CEO), they are a Tree.
        // Refined Heuristic: Orphans are roots with NO children. Trees are roots WITH children.
        // But what if CEO has just started and has no team yet? They should ideally look like a tree root.
        // Let's stick to the requested "Unassigned" logic. If they are not linked, they are unassigned.

        const treeRoots: TreeNode[] = [];
        const orphanNodes: TreeNode[] = [];

        roots.forEach(root => {
            if (root.children.length > 0) {
                treeRoots.push(root);
            } else {
                orphanNodes.push(root);
            }
        });

        // Special case: If ALL roots are orphans (no connections at all), maybe separate by Role?
        // If CEO is alone, let's put them in treeRoots?
        // Let's check roles.
        // For now, simple length check is good.

        // If there's a CEO but no one else, allow them in the tree section if explicit 'CEO' role?
        // Let's keep it consistent: No connections = Independent/Orphan.
        // This encourages assigning managers.

        return { treeRoots, orphanNodes };
    };

    const renderNode = (node: TreeNode) => {
        return (
            <div key={node.user.id} className="flex flex-col items-center">
                <div className="relative bg-white p-4 rounded-xl shadow-sm border border-slate-200 w-64 text-center z-10 transition-transform hover:-translate-y-1 hover:shadow-md mb-8">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold mx-auto mb-3 border-2 border-white shadow-sm">
                        {node.user.profile?.firstName?.charAt(0) || node.user.email.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg truncate">
                        {node.user.profile ? `${node.user.profile.firstName} ${node.user.profile.lastName}` : node.user.email}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mb-1">{node.user.profile?.designation || 'Employee'}</p>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                        {node.user.role}
                    </span>

                    {/* Connection Line to children */}
                    {node.children.length > 0 && (
                        <div className="absolute top-full left-1/2 w-px h-8 bg-slate-300 -translate-x-1/2"></div>
                    )}
                </div>

                {node.children.length > 0 && (
                    <div className="flex gap-8 relative">
                        {/* Horizontal connector line above children */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-slate-300 -translate-y-px"></div>

                        {node.children.map((child, index) => (
                            <div key={child.user.id} className="relative pt-8">
                                {/* Vertical connector from horizontal line to child */}
                                <div className="absolute top-0 left-1/2 w-px h-8 bg-slate-300 -translate-x-1/2"></div>
                                {renderNode(child)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-8 min-h-screen bg-slate-50 overflow-auto">
            <h1 className="text-2xl font-bold mb-8 text-slate-800">Organizational Structure</h1>

            {loading ? (
                <div className="text-center p-8">Loading structure...</div>
            ) : (
                <>
                    {/* Connected Trees */}
                    {trees.length > 0 && (
                        <div className="mb-16">
                            <h2 className="text-lg font-semibold text-slate-500 mb-8 border-b pb-2">Hierarchical Chart</h2>
                            <div className="flex justify-center min-w-max">
                                {trees.map(node => renderNode(node))}
                            </div>
                        </div>
                    )}

                    {/* Unassigned / Individual Entries */}
                    {orphans.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-slate-500 mb-8 border-b pb-2">Unassigned / Individual Entries</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {orphans.map(node => (
                                    <div key={node.user.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center hover:shadow-md transition-shadow">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xl font-bold mx-auto mb-3">
                                            {node.user.profile?.firstName?.charAt(0) || node.user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-lg">
                                            {node.user.profile ? `${node.user.profile.firstName} ${node.user.profile.lastName}` : node.user.email}
                                        </h3>
                                        <p className="text-sm text-slate-500 font-medium">{node.user.profile?.designation || 'Unassigned'}</p>
                                        <span className="inline-block mt-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                            {node.user.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {trees.length === 0 && orphans.length === 0 && (
                        <div className="text-center text-slate-500">No employees found.</div>
                    )}
                </>
            )}
        </div>
    );
};

export default OrgChart;
