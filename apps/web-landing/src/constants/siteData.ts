import {
  ShieldAlert,
  MapPin,
  BellRing,
  Activity,
  Zap,
  Lock,
  Smartphone,
  Cloud,
} from 'lucide-react';

export const features = [
  {
    icon: ShieldAlert,
    title: 'Emergency SOS',
    description: 'Trigger immediate alerts with precise GPS location to all registered emergency contacts and local authorities.',
  },
  {
    icon: Activity,
    title: 'Crash Detection',
    description: 'Advanced ML models analyze sensor data to automatically detect vehicle collisions and dispatch help without manual intervention.',
  },
  {
    icon: Zap,
    title: 'QR & Plate Scanning',
    description: 'Computer vision instantly reads vehicle QR codes and license plates using YOLOv8 and PaddleOCR for rapid identification.',
  },
  {
    icon: MapPin,
    title: 'Live Location Tracking',
    description: 'Continuous background location monitoring ensures responders know exactly where the emergency is happening.',
  },
  {
    icon: BellRing,
    title: 'Instant Notifications',
    description: 'Real-time SMS alerts via Twilio ensure that emergency contacts are notified the moment an incident is detected.',
  },
  {
    icon: Lock,
    title: 'Secure Authentication',
    description: 'Enterprise-grade security featuring JWT, two-factor authentication, and biometric verification.',
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'A native mobile application built on Expo ensures high performance and reliability even in critical situations.',
  },
  {
    icon: Cloud,
    title: 'Reliable Cloud Backend',
    description: 'Powered by a scalable FastAPI and PostgreSQL architecture hosted on AWS for zero-downtime reliability.',
  },
];

export const howItWorks = [
  {
    step: 1,
    title: 'Register & Setup',
    description: 'Create an account, verify your identity, and register your vehicle details in the app.',
  },
  {
    step: 2,
    title: 'Link Emergency Contacts',
    description: 'Add trusted friends, family, or medical personnel to be notified instantly in an emergency.',
  },
  {
    step: 3,
    title: 'Automatic Monitoring',
    description: 'The app runs quietly in the background, utilizing device sensors for automatic crash detection.',
  },
  {
    step: 4,
    title: 'Incident Trigger',
    description: 'An emergency is triggered either automatically by a crash or manually via the SOS button or QR scan.',
  },
  {
    step: 5,
    title: 'Rapid Response',
    description: 'Emergency contacts and relevant authorities receive immediate alerts with live GPS coordinates.',
  },
];

export const advantages = [
  { title: 'Faster Response', desc: 'Cut down emergency response times by an average of 40%.' },
  { title: 'Pinpoint Accuracy', desc: 'Eliminate confusion with exact GPS coordinates attached to every alert.' },
  { title: 'Always Active', desc: 'Background monitoring means you are protected even if you cannot reach your phone.' },
  { title: 'Encrypted Data', desc: 'Your personal and location data is encrypted both in transit and at rest.' },
];

export const faq = [
  {
    question: 'What is VQR?',
    answer: 'Vehicle Quick Response (VQR) is a comprehensive emergency response ecosystem consisting of a mobile app for users and responders, a QR/plate scanning system, and automatic crash detection capabilities.',
  },
  {
    question: 'Who can use it?',
    answer: 'VQR is designed for all vehicle owners prioritizing safety, as well as emergency response units who need rapid identification and incident data.',
  },
  {
    question: 'Does it require an internet connection?',
    answer: 'While an active connection ensures real-time cloud sync and live tracking, critical SMS fallbacks ensure alerts still go out in low-connectivity areas.',
  },
  {
    question: 'Is my location secure?',
    answer: 'Yes. We only actively track your location when an emergency is detected or if you manually trigger an SOS. All data is handled according to strict privacy standards.',
  },
  {
    question: 'How quickly are emergency alerts sent?',
    answer: 'Instantly. The moment a crash is detected or an SOS is triggered, SMS and push notifications are dispatched within milliseconds via our optimized backend.',
  },
];

export const technologies = {
  frontend: ['React', 'React Native', 'Expo', 'Vite', 'Tailwind/CSS'],
  backend: ['FastAPI (Python)', 'SQLAlchemy', 'PostgreSQL', 'SQLite'],
  ml: ['YOLOv8', 'PaddleOCR', 'scikit-learn', 'Keras'],
  cloud: ['AWS ALB', 'Docker'],
  auth: ['JWT', 'Bcrypt', '2FA'],
};
