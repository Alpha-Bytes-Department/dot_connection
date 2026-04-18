import { ReportUserInput } from './report.validation';
import { prisma } from '../../../DB/prisma';
import { emailHelper } from '../../../mail/emailHelper';

const sentReport = async ({
  reason,
  targetId,
  files,
  reporterId,
}: ReportUserInput) => {
  const user = await prisma.user.findUnique({
    where: { id: reporterId },
  });

  if (!user) throw new Error('User not found');

  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
  });

  if (!targetUser) throw new Error('Target user not found');

  const report = await prisma.report.create({
    data: {
      targetId,
      reason: `${reason}${files ? ` Attached files: ${files.map((path) => `https://api.truedots.com${path}`).join(' ')}` : ''}`,
      reporterId,
    },
  });

  await emailHelper.sendEmail({
    to: "trust-safety@truedots.com",
    subject: 'New User Reported',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #f9f9f9; padding: 32px;">
        <div style="background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">

          <div style="background: #d32f2f; padding: 20px 24px;">
            <h2 style="color: #fff; margin: 0; font-size: 18px;">⚠️ New User Report</h2>
            <p style="color: #ffcdd2; margin: 4px 0 0; font-size: 13px;">Submitted on ${new Date().toUTCString()}</p>
          </div>

          <div style="padding: 24px;">

            <p style="font-size: 13px; color: #777; margin: 0 0 20px;">A new report has been submitted. Please review the details below.</p>

            <h3 style="font-size: 13px; text-transform: uppercase; color: #999; margin: 0 0 8px; letter-spacing: 0.5px;">Reporter</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr style="background: #f5f5f5;">
                <td style="padding: 10px 14px; font-weight: 600; font-size: 13px; width: 140px; border: 1px solid #e0e0e0; color: #444;">Name</td>
                <td style="padding: 10px 14px; font-size: 13px; border: 1px solid #e0e0e0; color: #333;">${user.firstName} ${user.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; font-size: 13px; border: 1px solid #e0e0e0; color: #444;">ID</td>
                <td style="padding: 10px 14px; font-size: 13px; border: 1px solid #e0e0e0; color: #333;">${user.id}</td>
              </tr>
              <tr style="background: #f5f5f5;">
                <td style="padding: 10px 14px; font-weight: 600; font-size: 13px; border: 1px solid #e0e0e0; color: #444;">Email</td>
                <td style="padding: 10px 14px; font-size: 13px; border: 1px solid #e0e0e0; color: #333;">${user.email}</td>
              </tr>
            </table>

            <h3 style="font-size: 13px; text-transform: uppercase; color: #999; margin: 0 0 8px; letter-spacing: 0.5px;">Reported User</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr style="background: #f5f5f5;">
                <td style="padding: 10px 14px; font-weight: 600; font-size: 13px; width: 140px; border: 1px solid #e0e0e0; color: #444;">Name</td>
                <td style="padding: 10px 14px; font-size: 13px; border: 1px solid #e0e0e0; color: #333;">${targetUser.firstName} ${targetUser.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; font-size: 13px; border: 1px solid #e0e0e0; color: #444;">ID</td>
                <td style="padding: 10px 14px; font-size: 13px; border: 1px solid #e0e0e0; color: #333;">${targetUser.id}</td>
              </tr>
              <tr style="background: #f5f5f5;">
                <td style="padding: 10px 14px; font-weight: 600; font-size: 13px; border: 1px solid #e0e0e0; color: #444;">Email</td>
                <td style="padding: 10px 14px; font-size: 13px; border: 1px solid #e0e0e0; color: #333;">${targetUser.email}</td>
              </tr>
            </table>

            <h3 style="font-size: 13px; text-transform: uppercase; color: #999; margin: 0 0 8px; letter-spacing: 0.5px;">Report Details</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr style="background: #f5f5f5;">
                <td style="padding: 10px 14px; font-weight: 600; font-size: 13px; width: 140px; border: 1px solid #e0e0e0; color: #444;">Reason</td>
                <td style="padding: 10px 14px; font-size: 13px; border: 1px solid #e0e0e0; color: #333;">${reason}</td>
              </tr>
              ${files?.length ? `
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; font-size: 13px; border: 1px solid #e0e0e0; color: #444;">Attachments</td>
                <td style="padding: 10px 14px; font-size: 13px; border: 1px solid #e0e0e0;">
                  ${files.map((path) => `<a href="https://api.truedots.com${path}" style="display: block; color: #1565c0; margin-bottom: 4px;">${path}</a>`).join('')}
                </td>
              </tr>` : ''}
            </table>

          </div>

          <div style="background: #f5f5f5; padding: 14px 24px; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; font-size: 12px; color: #aaa;">This is an automated notification from TrueDots. Do not reply to this email.</p>
          </div>

        </div>
      </div>
    `,
  });

  return {
    id: report.id,
    targetId: report.targetId,
    reason: report.reason,
    reporterId: report.reporterId,
    createdAt: report.timestamp,
  };
};

export const ReportService = {
  sentReport,
};
