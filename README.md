# 🎓 Operon

> A modern school management platform built to simplify administration, academic workflows, communication, and operations for schools.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2d3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)

---

## 📌 Overview

**Operon** is a school management platform designed to help schools manage their day-to-day operations from a single, unified system.

The platform brings together academic administration, student management, teacher workflows, attendance, assessments, reporting, communication, payments, and other school operations into one central platform.

Operon is being developed with the needs of modern Nigerian schools in mind, with support for both primary and secondary school structures.

---

## 💡 The Problem

Many schools still rely heavily on paper records, spreadsheets, disconnected systems, and manual processes to manage their operations.

This can make it difficult to:

- Maintain accurate student records
- Generate student reports
- Track attendance
- Manage teachers and classes
- Organise school timetables
- Communicate with parents
- Track school fees
- Monitor student performance
- Coordinate administrative workflows

Operon aims to replace fragmented manual processes with a unified digital system.

---

## ⭐ Core Features

### 🎒 Student Management

- Student registration and admission
- Student profiles
- Student records
- Class and arm assignment
- Student promotion
- Student archiving

### 📚 Academic Management

- Subject management
- Class management
- Assessment and scores
- Class positions
- Student performance tracking
- Report generation

### 👨‍🏫 Teacher Management

- Teacher profiles
- Teacher assignments
- Class responsibilities
- Subject assignments
- Teacher workflows

### 📋 Attendance

- Daily attendance tracking
- Student attendance records
- Attendance monitoring

### 🗓️ Timetable Management

- Class timetable management
- Teacher timetable management
- Conflict prevention
- Support for multiple classes and arms

### 💳 School Fees

- Fee management
- Parent fee records
- Payment tracking
- Payment integration

### 👨‍👩‍👧 Parent Portal

- Student information
- Academic updates
- Attendance information
- School communication
- Fee information

### ⚙️ Administration

- School administration dashboard
- User and role management
- School configuration
- Academic session and term management

---

## 👥 User Roles

Operon is designed around role-based access.

Current roles include:

- 👑 **Super Admin**
- 🏫 **School Admin**
- 💼 **Bursar**
- 👨‍🏫 **Class Teacher**
- 📖 **School Teacher**
- 🎓 **Student**
- 👨‍👩‍👧 **Parent**

Each role has access to functionality appropriate to its responsibilities.

---

## 🏗️ Architecture

Operon is currently built as a full-stack web application.

### 💻 Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### ⚙️ Backend

- Next.js server-side functionality
- API routes
- Authentication
- Role-based access control

### 🐘 Database

- PostgreSQL
- Prisma ORM

### 🛠️ Development Tools

- Node.js
- npm
- Git
- GitHub

> The architecture and technology stack may evolve as the platform develops.

---

## 📁 Project Structure

```text
Operon/
├── src/             # Application source code
├── prisma/          # Database schema and migrations
├── public/          # Public/static assets
├── data/            # Development/test data
├── scratch/         # Temporary development work
├── tests/           # Automated tests
├── docs/            # Technical documentation
├── .gitignore
├── package.json
├── next.config.ts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher
- **npm** / **yarn** / **pnpm**

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/HiNacho/School_mgt_system.git
   cd School_mgt_system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/operon_db?pgbouncer=true"
   DIRECT_URL="postgresql://user:password@localhost:5432/operon_db"

   NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY="FLWPUBK-..."
   FLW_SECRET_KEY="FLWSECK-..."
   FLW_SECRET_HASH="YOUR_WEBHOOK_HASH"
   ```

4. **Run database setup**:
   ```bash
   npx prisma db push
   ```

5. **Launch development server**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to view Operon.
