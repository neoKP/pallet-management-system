import React, { useState } from 'react';
import { Truck } from 'lucide-react';

interface BrandLogoProps {
    className?: string;
    imgClassName?: string;
}

const LOGO_URL = "/logo.png";

const BrandLogo: React.FC<BrandLogoProps> = ({
    className = "w-32 h-32",
    imgClassName = "p-1"
}) => {
    const [error, setError] = useState(false);

    return (
        <div
            className={`inline-flex items-center justify-center bg-white rounded-2xl sm:rounded-[1.5rem] shadow-2xl overflow-hidden shrink-0 ${className}`}
        >
            {error ? (
                <div className="bg-blue-600 w-full h-full flex items-center justify-center text-white">
                    <Truck size={32} className="animate-pulse" />
                </div>
            ) : (
                <img
                    src={LOGO_URL}
                    alt="Neo Siam Logo"
                    className={`w-full h-full object-contain ${imgClassName}`}
                    onError={() => setError(true)}
                    loading="lazy"
                />
            )}
        </div>
    );
};

export default BrandLogo;
