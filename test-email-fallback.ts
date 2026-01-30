// Test script to verify email service configuration
// This can be run locally to test email sending without deploying

import { sendIssueEmail } from './lib/emailService';

async function testEmailFallback() {
  console.log('Testing Email Fallback Configuration...\n');

  // Check environment variables
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FALLBACK_TO'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.log('\nPlease configure the following in your .env.local file:');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=your_email@gmail.com');
    console.log('SMTP_PASSWORD=your_app_password');
    console.log('EMAIL_FALLBACK_TO=recipient@example.com');
    process.exit(1);
  }

  console.log('✅ All required environment variables are set\n');
  console.log('Configuration:');
  console.log(`  SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`  SMTP Port: ${process.env.SMTP_PORT}`);
  console.log(`  SMTP User: ${process.env.SMTP_USER}`);
  console.log(`  Email To: ${process.env.EMAIL_FALLBACK_TO}\n`);

  // Test email data
  const testData = {
    title: 'Test Issue Report',
    description: 'This is a test email sent from the GaengleSimulator email fallback system.',
    userAgent: 'Test Script',
    timestamp: new Date().toISOString(),
    to: process.env.EMAIL_FALLBACK_TO!,
    from: process.env.SMTP_USER!,
  };

  console.log('Sending test email...');
  
  try {
    const result = await sendIssueEmail(testData);
    
    if (result) {
      console.log('✅ Email sent successfully!');
      console.log('\nPlease check your inbox at:', process.env.EMAIL_FALLBACK_TO);
      console.log('(Don\'t forget to check spam folder)');
    } else {
      console.error('❌ Failed to send email');
      console.log('\nPlease check:');
      console.log('1. SMTP credentials are correct');
      console.log('2. If using Gmail, you\'re using an App Password (not your regular password)');
      console.log('3. Your firewall allows connections to the SMTP server');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Only run if called directly
if (require.main === module) {
  testEmailFallback().catch(console.error);
}
