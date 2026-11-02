import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

export default async function SchoolProjectPrintManifestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [projectRes, historyRes, shopsRes] = await Promise.all([
    supabase.from('school_projects').select('*').eq('id', id).single(),
    supabase
      .from('school_student_history')
      .select('*')
      .eq('project_id', id)
      .order('logged_at', { ascending: true }),
    supabase.from('child_shops').select('id, name'),
  ]);

  if (!projectRes.data) notFound();

  const project = projectRes.data;
  const history = historyRes.data || [];
  const shops = shopsRes.data || [];

  const shopMap = new Map(shops.map((s: any) => [s.id, s.name]));
  const totalSetsCompleted = history.reduce((acc: number, curr: any) => acc + (curr.sets_count || 2), 0);

  return (
    <div className="min-h-screen bg-white text-black p-8 font-sans">
      
      {/* Top Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black tracking-tight">MKTF TAILORING WORKSHOP</h1>
          <h2 className="text-lg font-bold text-gray-800 uppercase mt-0.5">{project.school_name}</h2>
          <p className="text-xs text-gray-600 mt-1">
            Official Production, Completed Sets & Delivery Manifest Sheet
          </p>
        </div>

        <div className="text-right text-xs">
          <p className="font-bold">Date Printed: {new Date().toLocaleDateString('en-GB')}</p>
          <p className="font-mono text-gray-600">Total Records Logged: {history.length}</p>
          <p className="font-bold text-sm mt-1">Total Sets Produced: {totalSetsCompleted}</p>
        </div>
      </div>

      {/* Manifest Table */}
              <table className="w-full text-left text-xs border border-collapse border-black">
          <thead>
            <tr className="bg-gray-100 border-b border-black text-[11px] uppercase font-black">
              <th className="p-2 border border-black w-8 text-center">#</th>
              <th className="p-2 border border-black">Student Name</th>
              <th className="p-2 border border-black text-center w-12">Sets</th>
              <th className="p-2 border border-black text-center w-14">Kafada</th>
              <th className="p-2 border border-black text-center w-14">Hannu</th>
              <th className="p-2 border border-black text-center w-14">Riga</th>
              <th className="p-2 border border-black text-center w-14">Wando</th>
              <th className="p-2 border border-black">Fulfillment Stage & Alteration Note</th>
              <th className="p-2 border border-black text-center w-28">Sign-off</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300 font-mono text-[11px]">
            {history.map((item: any, idx: number) => {
              const isAlteration = item.log_type === 'ALTERATION_RESOLVED';

              return (
                <tr key={item.id} className={isAlteration ? 'bg-amber-50/80' : ''}>
                  <td className="p-2 border border-black text-center font-bold">{idx + 1}</td>
                  <td className="p-2 border border-black font-sans font-bold uppercase">{item.student_name}</td>
                  <td className="p-2 border border-black text-center">{item.sets_count || 2}</td>
                  <td className="p-2 border border-black text-center">{item.kafada}&quot;</td>
                  <td className="p-2 border border-black text-center">{item.hannu}&quot;</td>
                  <td className="p-2 border border-black text-center">{item.riga}&quot;</td>
                  <td className="p-2 border border-black text-center">{item.wando}&quot;</td>
                  <td className="p-2 border border-black font-sans">
                    {isAlteration ? (
                      <div>
                        <span className="font-bold text-rose-700 uppercase">
                          [RE-COMPLETED / ALTERATION RESOLVED]
                        </span>
                        <p className="text-[10px] text-gray-700 italic">
                          Reason: {item.alteration_note || 'Adjusted according to specifications'}
                        </p>
                      </div>
                    ) : (
                      <span className="font-bold text-emerald-800 uppercase">
                        ✓ First Production Completed
                      </span>
                    )}
                  </td>
                  <td className="p-2 border border-black text-center">
                    <span className="text-gray-300">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</span>
                  </td>
                </tr>
              );
            })}

            {history.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500 font-sans">
                  No uniforms marked completed yet. Uniforms will record here once marked done or resolved.
                </td>
              </tr>
            )}
          </tbody>
        </table>

      {/* Verification Signatures at Bottom */}
      <div className="mt-12 pt-6 border-t border-black grid grid-cols-2 gap-12 text-xs">
        <div>
          <p className="font-bold">Tailoring Master / Production Lead:</p>
          <div className="mt-8 border-b border-black w-48"></div>
          <p className="text-gray-500 mt-1">Signature & Stamp</p>
        </div>
        <div>
          <p className="font-bold">School Representative / Recipient:</p>
          <div className="mt-8 border-b border-black w-48"></div>
          <p className="text-gray-500 mt-1">Name & Signature</p>
        </div>
      </div>

    </div>
  );
}
