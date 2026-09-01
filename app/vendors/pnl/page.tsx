import { redirect } from 'next/navigation';

// 這個頁面已經整併進 /vendors 的「報表查詢」分頁，保留只是讓舊連結還能導對地方
export default function ProfitAndLossRedirect() {
  redirect('/vendors');
}
