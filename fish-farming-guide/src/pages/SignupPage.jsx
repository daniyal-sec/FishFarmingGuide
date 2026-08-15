import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Fish } from "lucide-react";
import { farmApi } from "@/integration/farmApi";
import "../styles/auth.css";

export default function SignupPage() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [farmName, setFarmName] = useState("");
    const [city, setCity] = useState("");
    const [province, setProvince] = useState("");
    const [role, setRole] = useState("user");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const signupData = {
            fullName: name,
            email,
            phone,
            password,
            farmName: role === "Consumer" ? "" : farmName,
            district: city,
            province,
            role
        };

        try {
            const data = await farmApi.signup(signupData);
            if (data.success) {
                alert("Account created successfully! Please login.");
                navigate("/");
            } else {
                setError(data.error || "Signup failed. Please try again.");
            }
        } catch (err) {
            console.error("Signup failed:", err);
            setError(err.message || "Server connection failed. Is your backend running?");
        } finally {
            setLoading(false);
        }
    };

    // Signup page uses the default farmer styling
    const details = {
        title: "Create Account",
        subtitle: "Smart Fish Farming Management",
        icon: <Fish color="#ffffff" size={36} strokeWidth={2.5} />,
        bgClass: "bg-farmer",
        iconBg: "#3b82f6",
        focusClass: "focus-farmer",
        btnBg: "#3b82f6"
    };

    return (
        <div className={`auth-container ${details.bgClass}`}>
            {/* Floating Bubbles */}
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
                <h1 className="auth-title">FISH FARMING GUIDE</h1>
                <p className="auth-subtitle">{details.subtitle}</p>
            </div>

            <div className="auth-card">
                <h2 className="card-title">{details.title}</h2>
                <p className="card-subtitle">Fill in the details below</p>

                <form onSubmit={handleSignup} className="auth-form">
                    <div className="input-group">
                        <label className="input-label">Full Name</label>
                        <div className={`input-wrapper input-wrapper-no-icon ${details.focusClass}`}>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" className="auth-input" required />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Email Address</label>
                        <div className={`input-wrapper input-wrapper-no-icon ${details.focusClass}`}>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="auth-input" required />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Phone Number (Optional)</label>
                        <div className={`input-wrapper input-wrapper-no-icon ${details.focusClass}`}>
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 03001234567" className="auth-input" />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <div className={`input-wrapper input-wrapper-no-icon ${details.focusClass}`}>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="auth-input" required />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Account Type</label>
                        <div className={`input-wrapper input-wrapper-no-icon ${details.focusClass}`}>
                            <select value={role} onChange={(e) => setRole(e.target.value)} className="auth-select" required>
                                <option value="user">Fish Farmer (Manage Farm & Sell)</option>
                                <option value="Consumer">Consumer / Buyer (Find Local Fish)</option>
                            </select>
                        </div>
                    </div>

                    {role === "user" && (
                        <div className="input-group">
                            <label className="input-label">Farm Name</label>
                            <div className={`input-wrapper input-wrapper-no-icon ${details.focusClass}`}>
                                <input type="text" value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="Enter your farm name" className="auth-input" required={role === "user"} />
                            </div>
                        </div>
                    )}

                    <div className="input-group">
                        <label className="input-label">City / District</label>
                        <div className={`input-wrapper input-wrapper-no-icon ${details.focusClass}`}>
                            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Enter your city/district" className="auth-input" required />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Province</label>
                        <div className={`input-wrapper input-wrapper-no-icon ${details.focusClass}`}>
                            <select value={province} onChange={(e) => setProvince(e.target.value)} className="auth-select" required>
                                <option value="">Select your province</option>
                                <option value="Punjab">Punjab</option>
                                <option value="Sindh">Sindh</option>
                                <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                                <option value="Balochistan">Balochistan</option>
                                <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                                <option value="Islamabad Capital Territory">Islamabad Capital Territory</option>
                            </select>
                        </div>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" disabled={loading} className="auth-button" style={{ backgroundColor: details.btnBg, marginTop: '0.5rem' }}>
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                <p className="auth-footer-text">
                    Already have an account?{" "}
                    <Link to="/" className="auth-link">Login</Link>
                </p>
            </div>

            <p className="auth-copyright">© 2025 Fish Farming Guide – FYP Project</p>
        </div>
    );
}
