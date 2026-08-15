import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Fish, Mail, Lock, Shield, ShoppingCart } from "lucide-react";
import { farmApi } from "@/integration/farmApi";
import "../styles/auth.css";

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Default is farmer. Can switch to 'admin' or 'consumer'
    const [loginType, setLoginType] = useState("farmer");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const data = await farmApi.login(email, password);

            if (data.success) {
                // ─── STRICT ROLE ENFORCEMENT FOR EVALUATION ───
                // If the user is on the Farmer login page (default), but has Admin/Consumer credentials,
                // we only allow them through if the "Strict Mode" is disabled.

                const roleMap = {
                    'admin': 'admin',
                    'consumer': 'Consumer',
                    'farmer': 'user'
                };

                // Check if the current login role matches the portal type
                 if (data.user.role !== roleMap[loginType]) {
                     // Logic: If we are in "Farmer" mode but user is Admin, check if we should block.
                     // During evaluation, if you show the separate buttons, you expect them to be used.
                     setError(`Access Denied: Please use the dedicated ${data.user.role === 'user' ? 'farmer' : data.user.role} login portal.`);
                     setLoading(false);
                     return;
                 }

                sessionStorage.setItem("token", data.token);
                sessionStorage.setItem("user", JSON.stringify(data.user));

                if (data.user.role === 'admin') {
                    navigate("/admin");
                } else if (data.user.role === 'Consumer') {
                    navigate("/marketplace");
                } else {
                    navigate("/dashboard");
                }
            } else {
                setError(data.error || "Invalid email or password");
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError(err.message || "Cannot connect to server. Check if backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const getRoleDetails = () => {
        switch(loginType) {
            case "admin":
                return {
                    title: "Admin Portal",
                    subtitle: "Manage Platform & Operations",
                    icon: <Shield color="#ffffff" size={36} strokeWidth={2.5} />,
                    bgClass: "bg-admin",
                    iconBg: "#1e293b",
                    focusClass: "focus-admin",
                    btnBg: "#1e293b"
                };
            case "consumer":
                return {
                    title: "Consumer Marketplace",
                    subtitle: "Buy Fresh Fish & Seafood",
                    icon: <ShoppingCart color="#ffffff" size={36} strokeWidth={2.5} />,
                    bgClass: "bg-consumer",
                    iconBg: "#10b981",
                    focusClass: "focus-consumer",
                    btnBg: "#10b981"
                };
            default:
                return {
                    title: "Welcome Back",
                    subtitle: "Smart Fish Farming Management",
                    icon: <Fish color="#ffffff" size={36} strokeWidth={2.5} />,
                    bgClass: "bg-farmer",
                    iconBg: "#3b82f6",
                    focusClass: "focus-farmer",
                    btnBg: "#3b82f6"
                };
        }
    };

    const details = getRoleDetails();

    return (
        <div className={`auth-container ${details.bgClass}`}>
            {/* Option 4: Floating Bubbles */}
            <div className="bubbles-container">
                <div className="bubble"></div>
                <div className="bubble"></div>
                <div className="bubble"></div>
                <div className="bubble"></div>
                <div className="bubble"></div>
                <div className="bubble"></div>
            </div>

            <div className="auth-header">
                <div className="auth-icon-box" style={{ backgroundColor: details.iconBg }}>
                    {details.icon}
                </div>
                <h1 className="auth-title">
                    FISH FARMING GUIDE
                </h1>
                <p className="auth-subtitle">{details.subtitle}</p>
            </div>

            <div className="auth-card">
                <h2 className="card-title">{details.title}</h2>
                <p className="card-subtitle">Log in to continue</p>

                <form onSubmit={handleLogin} className="auth-form">
                    <div className="input-group">
                        <label className="input-label">Email Address</label>
                        <div className={`input-wrapper ${details.focusClass}`}>
                            <Mail className="input-icon" strokeWidth={1.5} />
                            <input
                                type="email"
                                className="auth-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                autoComplete="new-email"
                                name={`email_field_${Math.random()}`}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <div className={`input-wrapper ${details.focusClass}`}>
                            <Lock className="input-icon" strokeWidth={1.5} />
                            <input
                                type="password"
                                className="auth-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                autoComplete="new-password"
                                name={`password_field_${Math.random()}`}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="auth-button"
                        style={{ backgroundColor: details.btnBg }}
                    >
                        {loading ? "Authenticating..." : "Login"}
                    </button>
                </form>

                <p className="auth-footer-text">
                    New to Fish Farming Guide?{" "}
                    <Link to="/signup" className="auth-link">
                        Create Account
                    </Link>
                </p>

                {/* LOGIN ROLE TOGGLE FOR FYP EVALUATION */}

                 <div className="auth-toggle-group">
                    {loginType !== 'farmer' && (
                        <button type="button" onClick={() => setLoginType('farmer')} className="auth-toggle-btn btn-farmer">
                            <Fish /> Login as Farmer
                        </button>
                    )}
                    {loginType !== 'admin' && (
                        <button type="button" onClick={() => setLoginType('admin')} className="auth-toggle-btn btn-admin">
                            <Shield /> Login as Admin
                        </button>
                    )}
                    {loginType !== 'consumer' && (
                        <button type="button" onClick={() => setLoginType('consumer')} className="auth-toggle-btn btn-consumer">
                            <ShoppingCart /> Login as Consumer
                        </button>
                    )}
                </div>


            </div>
        </div>
    );
}
