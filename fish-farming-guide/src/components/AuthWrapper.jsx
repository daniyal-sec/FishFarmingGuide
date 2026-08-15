import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthWrapper({ children }) {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = sessionStorage.getItem("token");
        if (!token) {
            navigate("/", { replace: true });
        } else {
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, [navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return children;
}
