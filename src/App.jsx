import React, { useState, useEffect } from 'react';

function App() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);

    // Helper to parse download string into a number for sorting
    const parseDownloads = (downloadStr) => {
        if (!downloadStr || downloadStr === 'N/A') return 0;

        // Remove "+", ",", and spaces
        let cleanStr = downloadStr.replace(/[+,\s]/g, '').toUpperCase();

        let multiplier = 1;
        if (cleanStr.includes('K')) {
            multiplier = 1000;
            cleanStr = cleanStr.replace('K', '');
        } else if (cleanStr.includes('M')) {
            multiplier = 1000000;
            cleanStr = cleanStr.replace('M', '');
        } else if (cleanStr.includes('B')) {
            multiplier = 1000000000;
            cleanStr = cleanStr.replace('B', '');
        }

        return parseFloat(cleanStr) * multiplier;
    };

    useEffect(() => {
        const loadStats = async () => {
            try {
                const response = await fetch('/stats.json');
                const data = await response.json();

                // Sort by downloads descending
                const sortedData = data.sort((a, b) => {
                    return parseDownloads(b.downloads) - parseDownloads(a.downloads);
                });

                setApps(sortedData);
            } catch (error) {
                console.error('Failed to load stats:', error);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);

    if (loading) {
        return (
            <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <h1 style={{ fontSize: '2rem' }}>Loading Tracker...</h1>
            </div>
        );
    }

    return (
        <div className="container">
            <header>
                <h1>Play Store Tracker</h1>
                <p className="subtitle">Dynamic portfolio tracking for <strong>Reydium</strong> (Sorted by Downloads)</p>
            </header>

            <div className="grid">
                {apps.map((app, index) => (
                    <div className="card" key={app.id} style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="card-header">
                            <img src={app.iconUrl} alt={app.name} className="app-icon" />
                            <div className="app-info">
                                <h2>{app.name}</h2>
                                <div className="package-id">{app.id}</div>
                            </div>
                        </div>

                        <div className="stats-container">
                            <div className="stat-item">
                                <span className="stat-label">Rating</span>
                                <span className="stat-value rating-value">
                                    {app.rating === 'N/A' || !app.rating ? '—' : `★ ${app.rating}`}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Downloads</span>
                                <span className="stat-value downloads-value">{app.downloads}</span>
                            </div>
                        </div>

                        <a
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="view-link"
                        >
                            View on Play Store
                        </a>
                    </div>
                ))}
            </div>

            <footer>
                <p>© 2026 Play Store App Tracker Utility • Dynamic Search Mode</p>
            </footer>
        </div>
    );
}

export default App;
