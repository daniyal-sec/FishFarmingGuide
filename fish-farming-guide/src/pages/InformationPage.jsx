import { useState, useEffect } from "react";
import { BookOpen, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function InformationPage() {
    const [activeTab, setActiveTab] = useState("complete-guides");
    const [guides, setGuides] = useState([]);
    const [loading, setLoading] = useState(true);

    // Track which section exactly is expanded across all guides
    const [expandedSections, setExpandedSections] = useState({});

    useEffect(() => {
        fetchGuides();
    }, []);

    const fetchGuides = async () => {
        try {
            setLoading(true);
            const data = await farmApi.getKnowledgeGuides();
            setGuides(data || []);
        } catch (error) {
            console.error("Failed to fetch knowledge guides:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const tabs = [
        { id: "complete-guides", label: "Complete Guides" },
        { id: "faq", label: "FAQ" },
        { id: "quick-tips", label: "Quick Tips" }
    ];

    const displayGuides = guides.filter(g =>
        g.TabCategory.toLowerCase().replace(/\s+/g, '-') === activeTab
    );

    return (
        <div className="flex-1 bg-gray-50/30 p-4 sm:p-6 lg:p-8 flex flex-col min-h-0 w-full overflow-hidden">
            <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 min-h-0">

                {/* Header Banner */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 flex items-start sm:items-center gap-5 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <BookOpen size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Fish Farming Knowledge Center</h1>
                        <p className="text-sm text-gray-500 font-medium mt-1">Complete guides and resources for successful aquaculture farming</p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-white rounded-full p-1.5 border border-gray-100 flex shadow-sm min-w-max">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 px-4 py-2.5 rounded-full text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? "bg-gray-50 text-gray-900 shadow-sm border border-gray-100/50"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-6 pb-20">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <p className="text-gray-400 text-sm font-medium">Loading Database Knowledge...</p>
                        </div>
                    ) : displayGuides.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 text-center px-4">
                            <BookOpen size={48} className="text-gray-200 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900">No content available</h3>
                            <p className="text-gray-400 text-sm mt-1 max-w-sm">No knowledge guides have been added dynamically to the SQL Database for this section yet.</p>
                        </div>
                    ) : (
                        displayGuides.map(guide => (
                            <div key={guide.GuideId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {/* Guide Title */}
                                <div className="p-5 sm:p-6 flex items-center gap-3 border-b border-gray-50">
                                    <BookOpen size={18} className="text-blue-600" />
                                    <h2 className="text-[16px] font-bold text-gray-800">{guide.Title}</h2>
                                </div>

                                {/* Accordion Sections */}
                                <div className="divide-y divide-gray-50">
                                    {(guide.sections || []).length === 0 ? (
                                        <div className="p-6 text-sm text-gray-400 font-medium italic text-center">
                                            No sections have been written for this guide yet.
                                        </div>
                                    ) : (
                                        guide.sections.map((section) => {
                                            const isExpanded = !!expandedSections[section.SectionId];

                                            return (
                                                <div key={section.SectionId} className="group flex flex-col">
                                                    <button
                                                        onClick={() => toggleSection(section.SectionId)}
                                                        className="w-full text-left px-5 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                                    >
                                                        <span className={`text-[14px] font-bold transition-colors ${isExpanded ? "text-blue-700" : "text-gray-700 group-hover:text-gray-900"}`}>
                                                            {section.Title}
                                                        </span>
                                                        <div className="text-gray-400 ml-4 shrink-0">
                                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </div>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="px-5 sm:px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                                                            <div className="prose prose-sm prose-gray max-w-none">
                                                                <p className="text-[13px] text-gray-600 leading-relaxed font-medium whitespace-pre-line">
                                                                    {section.ContentText || "Content is empty in database."}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
