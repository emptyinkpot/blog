import ProviderTable from "@/components/token-pool/ProviderTable";
import { providers } from "@/lib/mock-data";

export default function TokenPoolPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Token Pool</h1>
        <p>Provider scoring, fallback, latency, cooldown, and failure visibility.</p>
      </header>

      <ProviderTable providers={providers} />
    </div>
  );
}
