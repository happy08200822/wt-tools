import { redirect } from 'next/navigation';

// 這個頁面已經整合進 /admin 的「AI 用量報表」分頁，這裡保留只是為了讓舊連結/書籤還能導對地方
export default function RichMenuAdminRedirect() {
  redirect('/admin');
}
