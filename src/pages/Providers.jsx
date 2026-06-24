import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiGet, apiPost, apiPut, formatCurrency } from '../lib/api';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { FileText, DollarSign, PiggyBank, Search, Loader2, AlertCircle, Plus, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import FormModal from '../components/FormModal';
import ProviderForm from '../components/ProviderForm';

export default function Providers() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Local filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');

  // Modal Control States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [saving, setSaving] = useState(false);
  const providerFormRef = useRef();

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/providers');
      setProviders(res || []);
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Compute available specialties dynamically
  const specialties = useMemo(() => {
    const specs = providers.map(p => p.SPECIALTY);
    return ['All', ...Array.from(new Set(specs))];
  }, [providers]);

  // Client-side filtering of the 25 providers
  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      const matchesSearch = `${p.FIRST_NAME} ${p.LAST_NAME}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const matchesSpecialty = specialtyFilter === 'All' || p.SPECIALTY === specialtyFilter;
      
      return matchesSearch && matchesSpecialty;
    });
  }, [providers, searchTerm, specialtyFilter]);

  const openAddModal = () => {
    setSelectedProvider(null);
    setIsModalOpen(true);
  };

  const openEditModal = (provider) => {
    setSelectedProvider(provider);
    setIsModalOpen(true);
  };

  const handleSaveProvider = async (formData) => {
    setSaving(true);
    try {
      if (selectedProvider) {
        // Edit Mode
        await apiPut(`/providers/${selectedProvider.PROVIDER_ID}`, formData);
        toast.success(`Provider Dr. "${formData.first_name} ${formData.last_name}" updated successfully.`);
      } else {
        // Add Mode
        await apiPost('/providers', formData);
        toast.success(`Provider Dr. "${formData.first_name} ${formData.last_name}" added to roster.`);
      }
      setIsModalOpen(false);
      fetchProviders();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save provider record.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-9 w-9 text-blue-600 animate-spin" />
        <span className="text-sm font-semibold text-slate-500 font-sans">Loading provider rosters...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-6 flex items-start gap-4 max-w-xl mx-auto my-10 shadow-xs">
        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-base font-bold text-red-800 dark:text-red-300">Failed to load providers</h3>
          <p className="text-sm text-red-700 dark:text-red-400 mt-2">{error}</p>
          <button 
            onClick={fetchProviders}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200"
          >
            Retry Fetching
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar Row */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Provider Productivity</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium font-sans">Evaluate provider encounter volume, billing generation, and actual collections.</p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end">
          {/* Search name */}
          <div className="relative flex-1 md:w-64 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by physician name..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-[#131c2e] placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-foreground font-sans"
            />
          </div>

          {/* Specialty Dropdown */}
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-[#131c2e] text-slate-700 dark:text-foreground font-semibold cursor-pointer"
          >
            {specialties.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#dc2626] hover:bg-red-750 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs hover:shadow-md transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            Add Provider
          </button>
        </div>
      </div>

      {/* Grid of Provider Cards */}
      {filteredProviders.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-card border border-slate-100 dark:border-border rounded-xl text-slate-400 dark:text-slate-500 font-medium">
          No providers found matching your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredProviders.map((item, idx) => {
            const collectionRate = item.collection_rate || '0.0';

            return (
              <Card 
                key={item.PROVIDER_ID || idx} 
                className="border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                <CardHeader className="border-b border-slate-50 dark:border-border pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-foreground leading-snug">
                        Dr. {item.FIRST_NAME} {item.LAST_NAME}
                      </h3>
                      <Badge className="mt-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800">
                        {item.SPECIALTY}
                      </Badge>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">Collection Rate</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">{collectionRate}%</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-5 pb-6 space-y-4">
                  {/* Visits KPI Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-605 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Signed Visits</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.signed_visits}</span>
                  </div>

                  {/* Gross Billed Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Gross Billed</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(item.gross_billed)}</span>
                  </div>

                  {/* Collected Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30">
                        <PiggyBank className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Collected</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(item.collected)}</span>
                  </div>

                  {/* Hover Edit Overlay Action Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 border border-slate-200 dark:border-border hover:border-slate-350 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-955 dark:hover:text-white bg-white dark:bg-[#1a2438] hover:bg-slate-55 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold tracking-wide cursor-pointer transition-all duration-200"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Provider
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Provider Add/Edit Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProvider ? 'Edit Provider Details' : 'Add New Provider'}
        saveLabel={selectedProvider ? 'Save Changes' : 'Add Provider'}
        loading={saving}
        onSave={() => providerFormRef.current?.submit()}
      >
        <ProviderForm
          ref={providerFormRef}
          initialData={selectedProvider}
          onSubmit={handleSaveProvider}
        />
      </FormModal>
    </div>
  );
}
