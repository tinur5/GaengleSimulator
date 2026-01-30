// app/api/issues/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendIssueEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { title, description, userAgent, timestamp } = await request.json();

    // Validate input
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Titel und Beschreibung sind erforderlich' },
        { status: 400 }
      );
    }

    // Get GitHub token from environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO || 'tinur5/GaengleSimulator';

    if (!githubToken) {
      console.log('GITHUB_TOKEN ist nicht konfiguriert, verwende Email-Fallback');
      
      // Try to send via email as fallback
      const emailFallbackTo = process.env.EMAIL_FALLBACK_TO;
      const smtpUser = process.env.SMTP_USER;
      
      if (!emailFallbackTo || !smtpUser) {
        console.error('Email-Fallback ist nicht konfiguriert');
        return NextResponse.json(
          { error: 'GitHub-Integration und Email-Fallback sind nicht konfiguriert' },
          { status: 500 }
        );
      }

      // Send issue report via email
      const emailSent = await sendIssueEmail({
        title,
        description,
        userAgent,
        timestamp,
        to: emailFallbackTo,
        from: smtpUser,
      });

      if (emailSent) {
        return NextResponse.json({
          success: true,
          message: 'Issue wurde per Email gesendet',
          fallbackUsed: true,
        });
      } else {
        return NextResponse.json(
          { error: 'Fehler beim Senden der Email' },
          { status: 500 }
        );
      }
    }

    // Create issue body with metadata
    const issueBody = `${description}

---

**Technische Details:**
- Zeitpunkt: ${timestamp}
- User Agent: ${userAgent}
- Gemeldet über: App Issue Reporter`;

    // Create GitHub issue using GitHub API
    const response = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body: issueBody,
        labels: ['user-reported'],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API Fehler - Status:', response.status);
      return NextResponse.json(
        { error: 'Fehler beim Erstellen des Issues' },
        { status: response.status }
      );
    }

    const issue = await response.json();
    
    return NextResponse.json({
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
    });

  } catch (error) {
    console.error('Fehler beim Erstellen des Issues:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
