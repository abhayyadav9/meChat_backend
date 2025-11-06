export const Verification_Email_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Verify Your meChat Account</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f7f8fc; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 10px; box-shadow: 0 8px 25px rgba(0,0,0,0.08); overflow: hidden; }
  .header { background: #4a90e2; color: #fff; text-align: center; padding: 25px; font-size: 26px; font-weight: 700; letter-spacing: 1px; }
  .content { padding: 30px; line-height: 1.7; color: #333; }
  .verification-code { display: inline-block; background: #eaf3ff; border: 1px dashed #4a90e2; border-radius: 6px; color: #4a90e2; font-size: 22px; font-weight: 600; padding: 12px 24px; margin: 20px 0; letter-spacing: 3px; }
  .footer { text-align: center; background: #f1f3f6; padding: 15px; color: #777; font-size: 13px; border-top: 1px solid #e1e1e1; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">Verify Your meChat Account</div>
    <div class="content">
      <p>Hey there 👋,</p>
      <p>Welcome to <strong>meChat</strong> — where real connections happen! To activate your account, please use the verification code below:</p>
      <div class="verification-code">{verificationCode}</div>
      <p>This code will expire in <strong>10 minutes</strong>. Don’t share it with anyone for your account’s safety.</p>
      <p>If you didn’t sign up for meChat, please ignore this email.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} meChat Inc. | Stay connected 💬
    </div>
  </div>
</body>
</html>
`;
export const Welcome_Email_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Welcome to meChat!</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #4a90e2, #357ae8); color: white; text-align: center; padding: 25px; font-size: 28px; font-weight: bold; }
  .content { padding: 30px; line-height: 1.8; color: #333; }
  .button { display: inline-block; background: #4a90e2; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 15px; transition: background 0.3s; }
  .button:hover { background: #357ae8; }
  .footer { background: #f1f3f6; padding: 15px; text-align: center; color: #777; font-size: 13px; border-top: 1px solid #e1e1e1; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">Welcome to meChat 🎉</div>
    <div class="content">
      <p>Hey {name},</p>
      <p>We’re super excited to have you join the <strong>meChat</strong> community!</p>
      <p>Start chatting instantly with your friends, create groups, share media, and even jump into voice/video calls seamlessly.</p>
      <a href="https://mechat.com/app" class="button">Start Chatting</a>
      <p>If you need help, our support team’s always a ping away 💬</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} meChat Inc. | Let’s stay connected!
    </div>
  </div>
</body>
</html>
`;
export const Reset_Password_Email_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reset Your meChat Password</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f7f8fc; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 10px; box-shadow: 0 8px 25px rgba(0,0,0,0.08); overflow: hidden; }
  .header { background: #ff9800; color: white; text-align: center; padding: 25px; font-size: 26px; font-weight: bold; }
  .content { padding: 30px; color: #333; line-height: 1.7; }
  .reset-code { display: inline-block; background: #fff3e0; border: 1px dashed #ff9800; color: #ff9800; font-weight: 600; font-size: 22px; border-radius: 6px; padding: 12px 24px; margin: 20px 0; letter-spacing: 3px; }
  .footer { background: #f1f3f6; text-align: center; padding: 15px; color: #777; font-size: 13px; border-top: 1px solid #e1e1e1; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">Reset Your meChat Password</div>
    <div class="content">
      <p>Hey,</p>
      <p>We got a request to reset your password. Use the code below to proceed:</p>
      <div class="reset-code">{verificationCode}</div>
      <p>This code will expire in <strong>30 minutes</strong> for your security.</p>
      <p>If you didn’t request this, you can safely ignore this email — your account is secure.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} meChat Inc. | Secure. Simple. Social.
    </div>
  </div>
</body>
</html>
`;
