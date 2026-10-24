import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { NewScrapePage } from './pages/NewScrapePage';
import { LiveCrawlPage } from './pages/LiveCrawlPage';
import { CrawlHistoryPage } from './pages/CrawlHistoryPage';
import { CrawlDetailPage } from './pages/CrawlDetailPage';
import { MarkdownFilesPage } from './pages/MarkdownFilesPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { CrawlStats } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedDetailJobId, setSelectedDetailJobId] = useState<string | null>(null);
  const [selectedFilesJobId, setSelectedFilesJobId] = useState<string | null>(null);
  const [scrapeInitialMode, setScrapeInitialMode] = useState<'url' | 'wikipedia'>('url');
  
  const [stats, setStats] = useState<CrawlStats | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Poll stats and health
  const refreshStatsAndHealth = async () => {
    try {
      await api.getHealth();
      setIsBackendHealthy(true);
    } catch {
      setIsBackendHealthy(false);
    }

    try {
      const statsData = await api.getStats();
      setStats(statsData);
      
      // If there are active running jobs and no activeJobId, select the first running one
      if (statsData.active_jobs > 0 && !activeJobId) {
        const running = statsData.recent_jobs.find((j) => j.status === 'running');
        if (running) setActiveJobId(running.id);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    refreshStatsAndHealth();
    const interval = setInterval(refreshStatsAndHealth, 10000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const handleJobStarted = (jobId: string) => {
    setActiveJobId(jobId);
    setCurrentTab('live-job');
    refreshStatsAndHealth();
  };

  const handleOpenJob = (jobId: string) => {
    setSelectedDetailJobId(jobId);
    setCurrentTab('history');
  };

  const handleNewScrapeClick = (mode: 'url' | 'wikipedia' = 'url') => {
    setScrapeInitialMode(mode);
    setCurrentTab('new-scrape');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080d1a] text-slate-100">
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'history') {
            setSelectedDetailJobId(null);
          }
          setCurrentTab(tab);
        }}
        activeJobId={activeJobId}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <Navbar
          onNewScrapeClick={() => handleNewScrapeClick('url')}
          onRefreshClick={() => setRefreshTrigger((prev) => prev + 1)}
          isBackendHealthy={isBackendHealthy}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {currentTab === 'dashboard' && (
            <DashboardPage
              stats={stats}
              onNewScrapeClick={handleNewScrapeClick}
              onOpenJob={(jobId) => {
                setSelectedDetailJobId(jobId);
                setCurrentTab('history');
              }}
              onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
            />
          )}

          {currentTab === 'new-scrape' && (
            <NewScrapePage
              initialMode={scrapeInitialMode}
              onJobStarted={handleJobStarted}
            />
          )}

          {currentTab === 'live-job' && activeJobId && (
            <LiveCrawlPage
              jobId={activeJobId}
              onOpenDetails={(jobId) => {
                setSelectedDetailJobId(jobId);
                setCurrentTab('history');
              }}
              onOpenFiles={(jobId) => {
                setSelectedFilesJobId(jobId);
                setCurrentTab('files');
              }}
            />
          )}

          {currentTab === 'history' && (
            selectedDetailJobId ? (
              <CrawlDetailPage
                jobId={selectedDetailJobId}
                onBack={() => setSelectedDetailJobId(null)}
                onOpenLive={(jobId) => {
                  setActiveJobId(jobId);
                  setCurrentTab('live-job');
                }}
              />
            ) : (
              <CrawlHistoryPage
                onOpenJob={(jobId) => setSelectedDetailJobId(jobId)}
                onRefreshTrigger={refreshTrigger}
              />
            )
          )}

          {currentTab === 'files' && (
            <MarkdownFilesPage initialJobId={selectedFilesJobId} />
          )}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
