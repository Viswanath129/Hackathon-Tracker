import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import TubesCursor from 'threejs-components/build/cursors/tubes1.min.js';

const Welcome = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize the cursor effect
        const app = TubesCursor(canvasRef.current, {
            tubes: {
                colors: ["#f967fb", "#53bc28", "#6958d5"],
                lights: {
                    intensity: 200,
                    colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"]
                }
            }
        });

        const randomColors = (count) => {
            return new Array(count)
                .fill(0)
                .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
        };

        const handleClick = () => {
            const colors = randomColors(3);
            const lightsColors = randomColors(4);
            app.tubes.setColors(colors);
            app.tubes.setLightsColors(lightsColors);
        };

        document.body.addEventListener('click', handleClick);

        // Cleanup
        return () => {
            document.body.removeEventListener('click', handleClick);
            // Three.js cleanup if the component unmounts
            if (app && app.destroy) app.destroy();
        };
    }, []);

    return (
        <div className="relative w-full h-screen font-sans overflow-hidden bg-black text-white">
            <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none"></canvas>

            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center gap-6 pointer-events-none px-4 text-center">
                <h1 className="text-4xl md:text-6xl font-bold uppercase drop-shadow-[0_0_20px_rgba(0,0,0,1)] tracking-widest text-[#ff9900]">
                    AVANTHI INNOVATION HUB
                </h1>
                <h2 className="text-2xl md:text-5xl font-light uppercase drop-shadow-[0_0_20px_rgba(0,0,0,1)] tracking-widest text-slate-200">
                    TEAM MANAGEMENT
                </h2>

                <div className="mt-8 flex gap-6 pointer-events-auto">
                    <Link to="/login" className="px-8 py-3 bg-transparent border-2 border-[#ff9900] text-[#ff9900] hover:bg-[#ff9900] hover:text-[#0f1b2a] font-bold rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(255,153,0,0.3)] hover:shadow-[0_0_25px_rgba(255,153,0,0.6)] backdrop-blur-sm">
                        TEAM LOGIN
                    </Link>
                    <Link to="/admin/login" className="px-8 py-3 bg-transparent border-2 border-slate-500 text-slate-300 hover:bg-slate-300 hover:text-[#0f1b2a] font-bold rounded-lg transition-all duration-300 backdrop-blur-sm">
                        ADMIN LOGIN
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Welcome;
