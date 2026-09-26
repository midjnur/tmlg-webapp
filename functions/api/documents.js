/**
 * Cloudflare Function to handle document requests
 * POST /api/documents
 * Body: { email, carId, name }
 */

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email, carId, name } = await request.json();

    if (!email || !carId) {
      return new Response(
        JSON.stringify({ error: 'Missing email or carId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert into D1 database
    const db = env.DB;
    const timestamp = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO document_requests (email, car_id, visitor_name, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(email, carId, name || 'Anonymous', timestamp)
      .run();

    // Send confirmation email via Resend (if available)
    if (env.RESEND_API_KEY) {
      await sendConfirmationEmail(email, carId, env.RESEND_API_KEY);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Request received. Check your email for documents.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function sendConfirmationEmail(email, carId, apiKey) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'noreply@themotorlist.ge',
        to: email,
        subject: `Your car documents from TMLG`,
        html: `
          <h2>Thank you for your interest!</h2>
          <p>We've received your document request for car <strong>${carId}</strong>.</p>
          <p>The seller will send you detailed information within 24 hours.</p>
          <p>Keep an eye on your inbox!</p>
          <hr />
          <p><a href="https://themotorlist.ge">Back to themotorlist.ge</a></p>
        `,
      }),
    });

    if (!response.ok) {
      console.error('Resend API error:', await response.text());
    }
  } catch (error) {
    console.error('Email sending failed (non-blocking):', error);
  }
}
