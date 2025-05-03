// src/App.jsx
import { Routes, Route } from "react-router-dom";

// Page components
import Index from "./pages/Index"; // Landing page
import Login from "./pages/Login";
import LoginTutor from "./pages/LoginTutor";
import Signup from "./pages/SIgnup";
import SignupTutor from "./pages/SignupTutor";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/resetPassword"; 
import HomepageStudent from "./pages/HomepageStudent";
import HomepageTutor from "./pages/HomepageTutor";
import DashboardStudent from "./pages/DashboardStudent";
import DashboardTutor from "./pages/DashboardTutor";
import Contact from "./pages/Contact";
import StudentTutors from "./pages/StudentTutors";
import StudentSubjects from "./pages/StudentSubjects";
import StudentMessages from "./pages/StudentMessages";
import StudentHistory from "./pages/StudentSessionHistory";
import StudentSchedule from "./pages/StudentSchedule";
import ScheduleAppointment from "./pages/ScheduleAppointment";
import AppointmentConfirmed from "./pages/AppointmentConfirmed";
import Response from "./pages/Response";

function App() {
  return (
    <Routes>
      {/* Landing & Auth */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login-tutor" element={<LoginTutor />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/signup-tutor" element={<SignupTutor />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} /> 

      {/* General */}
      <Route path="/contact" element={<Contact />} />
      <Route path="/response" element={<Response />} />

      {/* Student */}
      <Route path="/homepage-student" element={<HomepageStudent />} />
      <Route path="/student-dashboard" element={<DashboardStudent />} />
      <Route path="/student-tutors" element={<StudentTutors />} />
      <Route path="/student-subjects" element={<StudentSubjects />} />
      <Route path="/student-messages" element={<StudentMessages />} />
      <Route path="/student-session-history" element={<StudentHistory />} />
      <Route path="/student-schedule" element={<StudentSchedule />} />
      <Route path="/schedule-appointment" element={<ScheduleAppointment />} />
      <Route path="/appointment-confirmed" element={<AppointmentConfirmed />} />

      {/* Tutor */}
      <Route path="/homepage-tutor" element={<HomepageTutor />} />
      <Route path="/tutor-dashboard" element={<DashboardTutor />} />
    </Routes>
  );
}

export default App;

