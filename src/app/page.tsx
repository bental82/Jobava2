// Main page — a Server Component. Loads both repertoires (PGN + cached
// explanations), builds the trees, and hands them to the interactive client.

import RepertoireApp from '@/components/RepertoireApp';
import { loadAllRepertoires } from '@/lib/repertoire';

export default function Page() {
  const repertoires = loadAllRepertoires();
  return <RepertoireApp repertoires={repertoires} />;
}
