import { useState } from "react";
import { useLocation, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import NavBar from "./NavBar";

export default function MainLayout() {
    const location = useLocation();
    const pathname = location.pathname;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Pages where sidebar/navbar should be hidden (admin has its own sidebar)
    const hideLayout = pathname === "/" || pathname === "/signup" || pathname === "/admin";

    if (hideLayout) {
        return <Outlet />;
    }

    return (
        <div className="flex flex-1 min-h-0">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-64">
                <NavBar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
