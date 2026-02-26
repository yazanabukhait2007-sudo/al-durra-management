/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Workers from "./pages/Workers";
import Tasks from "./pages/Tasks";
import Evaluations from "./pages/Evaluations";
import AddEvaluation from "./pages/AddEvaluation";
import EditEvaluation from "./pages/EditEvaluation";
import MonthlyReport from "./pages/MonthlyReport";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/evaluations" element={<Evaluations />} />
          <Route path="/evaluations/new" element={<AddEvaluation />} />
          <Route path="/evaluations/edit/:id" element={<EditEvaluation />} />
          <Route path="/reports" element={<MonthlyReport />} />
        </Routes>
      </Layout>
    </Router>
  );
}
