import { readFileSync } from 'fs';
import { basename } from 'path';
import * as nodemailer from 'nodemailer';

async function main() {
  const [reportPath, attachmentPath] = process.argv.slice(2);
  if (!reportPath) throw new Error('Backup report path is required');

  const user = process.env.EMAIL_SMTP_USER || '1833079849@qq.com';
  const pass = process.env.EMAIL_SMTP_PASS?.trim();
  const recipient = process.env.BACKUP_EMAIL_TO || user;
  if (!pass) throw new Error('EMAIL_SMTP_PASS is not configured');

  const report = readFileSync(reportPath, 'utf8');
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST || 'smtp.qq.com',
    port: Number(process.env.EMAIL_SMTP_PORT || 465),
    secure: process.env.EMAIL_SMTP_SECURE !== 'false',
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || '风隅随笔'}" <${process.env.EMAIL_FROM_ADDRESS || user}>`,
    to: recipient,
    subject: `【风隅随笔】生产备份报告 ${new Date().toISOString().slice(0, 10)}`,
    text: report,
    attachments: attachmentPath
      ? [{ filename: basename(attachmentPath), path: attachmentPath }]
      : [],
  });
}

main().catch((error) => {
  console.error(`Backup email failed: ${(error as Error).message}`);
  process.exit(1);
});
