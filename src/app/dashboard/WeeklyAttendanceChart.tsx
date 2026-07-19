'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

export default function WeeklyAttendanceChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px' }} />
        <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
        <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} name="Present" />
        <Bar dataKey="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={12} name="Absent" />
      </BarChart>
    </ResponsiveContainer>
  );
}
