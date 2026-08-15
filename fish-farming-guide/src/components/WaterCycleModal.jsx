import { useState } from "react";
import { Droplets } from "lucide-react";

export default function WaterCycleModal({ pond, onClose, onRecord }) {
    const [pH, setPH] = useState("");
    const [oxygen, setOxygen] = useState("");
    const [temperature, setTemperature] = useState("");
    const [ammonia, setAmmonia] = useState("");
    const [nitrite, setNitrite] = useState("");
    const [nitrate, setNitrate] = useState("");

    const isValid = pH !== "" && oxygen !== "" && temperature !== "" && ammonia !== "" && nitrite !== "" && nitrate !== "";

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-base sm:text-lg font-semibold text-black mb-1 sm:mb-2">Water Cycle Process</h2>
                <p className="text-xs sm:text-sm text-black mb-3 sm:mb-4">Record water cycle parameters for {pond?.name || "this pond"}</p>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-black">pH Level</label>
                        <input type="number" placeholder="e.g. 7.5" value={pH} onChange={e => setPH(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-black placeholder-black/50 appearance-none" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-black">Oxygen (mg/L)</label>
                        <input type="number" placeholder="e.g. 6.5" value={oxygen} onChange={e => setOxygen(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-black placeholder-black/50 appearance-none" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-black">Temperature (°C)</label>
                        <input type="number" placeholder="e.g. 28" value={temperature} onChange={e => setTemperature(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-black placeholder-black/50 appearance-none" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-1 gap-2 sm:gap-3">
                        <div>
                            <label className="text-xs font-medium text-black">Ammonia (mg/L)</label>
                            <input type="number" placeholder="e.g. 0.05" value={ammonia} onChange={e => setAmmonia(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-black placeholder-black/50 appearance-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-black">Nitrite (mg/L)</label>
                                <input type="number" placeholder="e.g. 0.1" value={nitrite} onChange={e => setNitrite(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-black placeholder-black/50 appearance-none" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-black">Nitrate (mg/L)</label>
                                <input type="number" placeholder="e.g. 10" value={nitrate} onChange={e => setNitrate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-black placeholder-black/50 appearance-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-200 text-black font-semibold">Cancel</button>
                    <button
                        disabled={!isValid}
                        onClick={() => {
                            onRecord({
                                current_ph: Number(pH),
                                current_do: Number(oxygen),
                                current_temp: Number(temperature),
                                current_ammonia: Number(ammonia),
                                current_nitrite: Number(nitrite),
                                current_nitrate: Number(nitrate)
                            });
                            // Parent's async onRecord handler will close the modal
                        }}
                        className={`px-4 py-2 text-sm rounded-lg text-white flex items-center gap-2 ${isValid ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}
                    >
                        <Droplets size={16} /> Record Water Cycle
                    </button>
                </div>
            </div>
        </div>
    );
}
