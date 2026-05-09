<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تسجيل الدخول - محادثات</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/whatsapp.css') }}">
    <style>
        .auth-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: var(--bg-header);
        }
        .auth-box {
            background-color: var(--bg-sidebar);
            padding: 40px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .auth-box h2 {
            color: var(--text-primary);
            margin-bottom: 20px;
            text-align: center;
        }
        .auth-input {
            width: 100%;
            padding: 12px;
            margin-bottom: 15px;
            border: 1px solid var(--border-color);
            background-color: var(--bg-main);
            color: var(--text-primary);
            outline: none;
        }
        .auth-btn {
            width: 100%;
            padding: 12px;
            background-color: var(--primary-color);
            color: white;
            border: none;
            cursor: pointer;
            font-weight: 600;
            font-size: 16px;
        }
        .auth-btn:hover {
            opacity: 0.9;
        }
        .auth-links {
            margin-top: 15px;
            text-align: center;
        }
        .auth-links a {
            color: var(--primary-color);
            text-decoration: none;
        }
        .error {
            color: #ef4444;
            margin-bottom: 15px;
            font-size: 14px;
        }
    </style>
</head>
<body class="light-mode">
    <div class="auth-container">
        <div class="auth-box sharp-corners">
            <h2>تسجيل الدخول</h2>
            
            @if($errors->any())
                <div class="error">{{ $errors->first() }}</div>
            @endif

            <form action="/login" method="POST">
                @csrf
                <input type="email" name="email" class="auth-input sharp-corners" placeholder="البريد الإلكتروني" required>
                <input type="password" name="password" class="auth-input sharp-corners" placeholder="كلمة المرور" required>
                <button type="submit" class="auth-btn sharp-corners">دخول</button>
            </form>
            <div class="auth-links">
                <a href="/register">ليس لديك حساب؟ إنشاء حساب جديد</a>
            </div>
        </div>
    </div>
    <script src="{{ asset('js/whatsapp.js') }}"></script>
</body>
</html>
