const BRAND = 'EMB R3 Service Queue Management System';
const PRIMARY = '#1d4ed8';
const ACCENT = '#b91c1c';
const GOLD = '#f59e0b';

function baseLayout({ title, body }) {
  return `
  <div style="margin:0;padding:24px;background:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 18px 40px -24px rgba(15,23,42,0.45);">
      <tr>
        <td style="background:linear-gradient(135deg,${PRIMARY},${ACCENT});padding:28px 32px;">
          <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};font-weight:700;">EMB R3 SQMS</div>
          <div style="font-size:20px;font-weight:700;color:#ffffff;margin-top:6px;">${title}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;font-size:15px;line-height:1.7;color:#334155;">
          ${body}
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
          ${BRAND}<br/>
          This is an automated message. Please do not reply.
        </td>
      </tr>
    </table>
  </div>`;
}

function button(href, label) {
  return `
  <a href="${href}" style="display:inline-block;margin:8px 0 20px;padding:13px 26px;background:${PRIMARY};color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
    ${label}
  </a>`;
}

function passwordResetTemplate({ name, resetUrl }) {
  const body = `
    <p>Hi ${name || 'Administrator'},</p>
    <p>We received a request to reset the password for your ${BRAND} admin account.</p>
    <p>Click the button below to choose a new password. This link expires in <strong>30 minutes</strong>.</p>
    ${button(resetUrl, 'Reset Password')}
    <p style="font-size:13px;color:#64748b;">If the button does not work, copy and paste this link into your browser:</p>
    <p style="font-size:13px;word-break:break-all;color:${PRIMARY};">${resetUrl}</p>
    <p style="font-size:13px;color:#64748b;">If you did not request this, you can safely ignore this email and your password will remain unchanged.</p>
  `;

  return {
    subject: 'Reset your EMB R3 SQMS admin password',
    html: baseLayout({ title: 'Password Recovery', body }),
  };
}

function welcomeTemplate({ name }) {
  const body = `
    <p>Hi ${name || 'Administrator'},</p>
    <p>Your administrator account for the ${BRAND} has been created successfully.</p>
    <p>You can now sign in to manage queues, monitor service counters, and oversee the dashboard.</p>
    <p style="font-size:13px;color:#64748b;">If you did not create this account, please contact your system administrator.</p>
  `;

  return {
    subject: 'Welcome to EMB R3 SQMS',
    html: baseLayout({ title: 'Account Created', body }),
  };
}

module.exports = {
  passwordResetTemplate,
  welcomeTemplate,
};
