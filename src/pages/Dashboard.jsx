import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  CalendarClock, 
  DollarSign, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import KpiCard from '../components/KpiCard';
import { apiGet, formatCurrency } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export default function Dashboard({ theme }) {
  const isDark = theme === 'dark';
  const [kpis, setKpis] = useState(null);
  const [providerData, setProviderData] = useState([]);
  const [statusRaw, setStatusRaw] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, providerRes, statusRes, monthlyRes] = await Promise.all([
        apiGet('/dashboard/kpis'),
        apiGet('/dashboard/revenue-by-provider'),
        apiGet('/dashboard/appointment-status'),
        apiGet('/dashboard/monthly-revenue')
      ]);

      setKpis(kpiRes);
      setProviderData(providerRes || []);
      setStatusRaw(statusRes || []);
      setMonthlyData(monthlyRes || []);
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatNumber = (num) => {
    const parsed = parseInt(num || 0, 10);
    return new Intl.NumberFormat('en-US').format(parsed);
  };

  const statusColors = useMemo(() => {
    return isDark ? {
      'Scheduled': '#60a5fa', // light blue
      'Completed': '#34d399', // bright green
      'Cancelled': '#94a3b8', // slate-400
      'No-Show': '#f87171',   // pastel red
    } : {
      'Scheduled': '#3b82f6', // blue
      'Completed': '#10b981', // green
      'Cancelled': '#94a3b8', // gray
      'No-Show': '#ef4444',   // red
    };
  }, [isDark]);

  const appointmentData = useMemo(() => {
    return statusRaw.map(item => ({
      name: item.status,
      value: item.count,
      color: statusColors[item.status] || (isDark ? '#818cf8' : '#6366f1')
    }));
  }, [statusRaw, statusColors, isDark]);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-9 w-9 text-blue-650 animate-spin" />
        <span className="text-sm font-semibold text-slate-500 font-sans">Loading clinical & financial KPIs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-6 flex items-start gap-4 max-w-xl mx-auto my-10 shadow-xs">
        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-base font-bold text-red-800 dark:text-red-300">Failed to load dashboard metrics</h3>
          <p className="text-sm text-red-700 dark:text-red-400 mt-2">{error}</p>
          <button 
            onClick={fetchDashboardData}
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
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KpiCard 
          label="Total Patients" 
          value={formatNumber(kpis?.totalPatients)} 
          icon={Users} 
          color="blue"
          subtitle="Registered in the system"
        />
        <KpiCard 
          label="Scheduled Appointments" 
          value={formatNumber(kpis?.scheduledAppointments)} 
          icon={CalendarClock} 
          color="indigo"
          subtitle="Active upcoming slots"
        />
        <KpiCard 
          label="Total Billed" 
          value={formatCurrency(kpis?.totalBilled)} 
          icon={DollarSign} 
          color="green"
          subtitle="Gross lifetime billing"
        />
        <KpiCard 
          label="Outstanding AR" 
          value={formatCurrency(kpis?.outstandingAR)} 
          icon={AlertCircle} 
          color="red"
          subtitle="Open or partial invoices"
        />
      </div>

      {/* Primary Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Provider */}
        <Card className="lg:col-span-2 border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs">
          <CardHeader className="border-b border-slate-50 dark:border-border px-4 md:px-6 py-4">
            <CardTitle className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100">Revenue by Provider (Top 10)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={providerData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'} />
                  <XAxis 
                    dataKey="provider" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip 
                    formatter={(val) => formatCurrency(val)} 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1a2438' : '#fff', 
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                      borderRadius: '8px'
                    }}
                    itemStyle={{ color: isDark ? '#e8edf5' : '#0f172a' }}
                    labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                  <Bar dataKey="billed" name="Gross Billed" fill={isDark ? '#60a5fa' : '#0f2942'} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill={isDark ? '#34d399' : '#10b981'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Status Pie/Donut */}
        <Card className="border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs">
          <CardHeader className="border-b border-slate-50 dark:border-border px-4 md:px-6 py-4">
            <CardTitle className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100">Appointment Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 flex flex-col items-center justify-between h-[320px]">
            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={appointmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {appointmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => [`${val} Appointments`, 'Volume']} 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1a2438' : '#fff', 
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                      borderRadius: '8px'
                    }}
                    itemStyle={{ color: isDark ? '#e8edf5' : '#0f172a' }}
                    labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs w-full px-2">
              {appointmentData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-slate-655 dark:text-slate-400 truncate">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Trend Line Chart */}
      <Card className="border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs">
        <CardHeader className="border-b border-slate-50 dark:border-border px-4 md:px-6 py-4">
          <CardTitle className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100">Monthly Revenue Trend (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'} />
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  formatter={(val) => formatCurrency(val)} 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1a2438' : '#fff', 
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                    borderRadius: '8px'
                  }}
                  itemStyle={{ color: isDark ? '#e8edf5' : '#0f172a' }}
                  labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="billed" 
                  name="Gross Billed" 
                  stroke={isDark ? '#60a5fa' : '#0f2942'} 
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 1.5, fill: isDark ? '#60a5fa' : '#0f2942' }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="collected" 
                  name="Collected" 
                  stroke={isDark ? '#34d399' : '#10b981'} 
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 1.5, fill: isDark ? '#34d399' : '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
