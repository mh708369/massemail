import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import bcrypt from "bcryptjs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    const password = await bcrypt.hash("password123", 10);
    const user = await prisma.user.upsert({
      where: { email: "admin@demo.com" },
      update: {},
      create: { name: "Admin User", email: "admin@demo.com", password, role: "admin" },
    });

    const contacts = await Promise.all([
      prisma.contact.upsert({ where: { email: "sarah@techcorp.com" }, update: {}, create: { name: "Sarah Johnson", email: "sarah@techcorp.com", phone: "+1-555-0101", company: "TechCorp", status: "customer", leadScore: 85, source: "Website" } }),
      prisma.contact.upsert({ where: { email: "mike@startup.io" }, update: {}, create: { name: "Mike Chen", email: "mike@startup.io", phone: "+1-555-0102", company: "StartupIO", status: "lead", leadScore: 72, source: "Referral" } }),
      prisma.contact.upsert({ where: { email: "emma@bigco.com" }, update: {}, create: { name: "Emma Wilson", email: "emma@bigco.com", phone: "+1-555-0103", company: "BigCo Inc", status: "lead", leadScore: 45, source: "LinkedIn" } }),
      prisma.contact.upsert({ where: { email: "james@retail.com" }, update: {}, create: { name: "James Brown", email: "james@retail.com", phone: "+1-555-0104", company: "RetailMax", status: "customer", leadScore: 90, source: "Conference" } }),
      prisma.contact.upsert({ where: { email: "lisa@design.co" }, update: {}, create: { name: "Lisa Park", email: "lisa@design.co", company: "DesignCo", status: "lead", leadScore: 60, source: "Website" } }),
    ]);

    await Promise.all([
      prisma.campaign.create({ data: { name: "Spring Product Launch", type: "email", status: "active", subject: "Introducing Our Latest Innovation", content: "Dear Customer,\n\nWe're thrilled to announce our newest product that will revolutionize your workflow. It's designed to save you time and boost productivity.\n\nKey features:\n- AI-powered automation\n- Real-time analytics\n- Seamless integrations\n\nGet started today with 20% off!", sentCount: 1250, openRate: 34.5, clickRate: 12.3 } }),
      prisma.campaign.create({ data: { name: "Customer Retention Q2", type: "email", status: "active", subject: "We Miss You! Special Offer Inside", content: "Hi there,\n\nWe noticed you haven't visited in a while. Here's a special 20% off coupon just for you.\n\nUse code: COMEBACK20\n\nWe've added some exciting new features since your last visit!", sentCount: 800, openRate: 28.1, clickRate: 8.7 } }),
      prisma.campaign.create({ data: { name: "New Feature Announcement", type: "email", status: "draft", subject: "Exciting New Features Just Launched", content: "Hello,\n\nWe've been working hard on some amazing new features that we know you'll love. Check them out today!" } }),
    ]);

    const deals = await Promise.all([
      prisma.deal.create({ data: { title: "Enterprise License", value: 50000, stage: "negotiation", probability: 75, contactId: contacts[0].id, notes: "Large enterprise deal, needs legal review" } }),
      prisma.deal.create({ data: { title: "Startup Package", value: 5000, stage: "proposal", probability: 50, contactId: contacts[1].id, notes: "Interested in starter plan" } }),
      prisma.deal.create({ data: { title: "Consulting Services", value: 25000, stage: "qualified", probability: 30, contactId: contacts[2].id } }),
      prisma.deal.create({ data: { title: "Annual Renewal", value: 35000, stage: "won", probability: 100, contactId: contacts[3].id, notes: "Renewed for another year" } }),
      prisma.deal.create({ data: { title: "Design Tools License", value: 8000, stage: "lead", probability: 10, contactId: contacts[4].id } }),
    ]);

    await Promise.all([
      prisma.activity.create({ data: { type: "call", description: "Discussed enterprise pricing and deployment timeline", userId: user.id, contactId: contacts[0].id, dealId: deals[0].id } }),
      prisma.activity.create({ data: { type: "email", description: "Sent proposal document with pricing breakdown", userId: user.id, contactId: contacts[1].id, dealId: deals[1].id } }),
      prisma.activity.create({ data: { type: "meeting", description: "Initial discovery call - identified needs and pain points", userId: user.id, contactId: contacts[2].id, dealId: deals[2].id } }),
      prisma.activity.create({ data: { type: "note", description: "Customer confirmed renewal at last year's rate", userId: user.id, contactId: contacts[3].id, dealId: deals[3].id } }),
      prisma.activity.create({ data: { type: "email", description: "Follow-up email with product demo link", userId: user.id, contactId: contacts[4].id, dealId: deals[4].id } }),
    ]);

    await Promise.all([
      prisma.ticket.create({ data: { subject: "Cannot access dashboard", description: "I'm getting a 403 error when trying to access the main dashboard.", status: "open", priority: "high", category: "technical", contactId: contacts[0].id, assignedToId: user.id } }),
      prisma.ticket.create({ data: { subject: "Billing question", description: "I'd like to understand the difference between the Pro and Enterprise billing tiers.", status: "in_progress", priority: "medium", category: "billing", contactId: contacts[1].id, aiSuggestion: "Our Pro plan includes core features while Enterprise adds advanced analytics, priority support, and custom integrations." } }),
      prisma.ticket.create({ data: { subject: "Feature request: Dark mode", description: "It would be great to have a dark mode option for the application.", status: "open", priority: "low", category: "feature_request", contactId: contacts[4].id } }),
    ]);

    await Promise.all([
      prisma.knowledgeBase.create({ data: { question: "How do I reset my password?", answer: "To reset your password:\n1. Go to the login page\n2. Click 'Forgot Password'\n3. Enter your email address\n4. Check your inbox for a reset link\n5. Click the link and set a new password", category: "Account" } }),
      prisma.knowledgeBase.create({ data: { question: "What are your business hours?", answer: "Our support team is available:\n- Monday to Friday: 9:00 AM - 6:00 PM EST\n- Saturday: 10:00 AM - 2:00 PM EST\n- Sunday: Closed", category: "General" } }),
      prisma.knowledgeBase.create({ data: { question: "How do I upgrade my plan?", answer: "To upgrade your plan:\n1. Go to Settings > Billing\n2. Click 'Change Plan'\n3. Select your desired plan\n4. Confirm the payment\n\nUpgrades take effect immediately.", category: "Billing" } }),
      prisma.knowledgeBase.create({ data: { question: "How do I get a refund?", answer: "We offer a 30-day money-back guarantee. To request a refund:\n1. Contact our support team\n2. Provide your account email and reason\n3. Refunds are processed within 5-7 business days", category: "Billing" } }),
      prisma.knowledgeBase.create({ data: { question: "How do I integrate with third-party tools?", answer: "We support integrations through our API and built-in connectors:\n- Slack: Settings > Integrations > Slack\n- Zapier: Use our Zapier app\n- API: See docs at docs.example.com/api", category: "Technical" } }),
    ]);

    return NextResponse.json({ success: true, message: "Seed data created! Login: admin@demo.com / password123" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
