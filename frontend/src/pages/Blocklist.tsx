import { useState, useEffect } from "react";
import { Ban, Trash2, Plus } from "lucide-react";
import "./Blocklist.css";

interface BlocklistEntry {
  id: string;
  participant_id: string;
  reason: string;
  created_at: string;
  participants?: { name: string; email: string };
}

export function Blocklist() {
  const [blocklistData, setBlocklistData] = useState<BlocklistEntry[]>([]);
  const [filteredData, setFilteredData] = useState<BlocklistEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = "Blocklist - TechNexus Community";
    loadBlocklist();
  }, []);

  const loadBlocklist = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/blocklist");
      const data = await response.json();
      const entries = data.data || [];
      setBlocklistData(entries);
      setFilteredData(entries);
      setCount(data.total || entries.length);
    } catch (error) {
      console.error("Failed to load blocklist:", error);
      setMessage({ type: "error", text: "Failed to load blocklist" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = blocklistData.filter((entry) =>
      entry.participants?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchTerm, blocklistData]);

  const handleRemove = async (participantId: string) => {
    if (!confirm("Remove from blocklist?")) return;
    try {
      await fetch(`/api/blocklist/\${participantId}`, { method: "DELETE" });
      setMessage({ type: "success", text: "Removed from blocklist" });
      await loadBlocklist();
    } catch (error) {
      console.error("Failed to remove:", error);
      setMessage({ type: "error", text: "Failed to remove from blocklist" });
    }
  };

  if (loading) {
    return (
      <div className="blocklist loading-container">
        <div className="spinner"></div>
        <p>Loading blocklist...</p>
      </div>
    );
  }

  return (
    <div className="blocklist">
      <div className="page-header">
        <div><h1>Blocklist</h1><p>Manage blocked participants</p></div>
        <button className="btn btn-primary btn-sm" onClick={loadBlocklist}>
          Refresh ({count})
        </button>
      </div>

      {message && <div className={`alert alert-\${message.type}`}>{message.text}</div>}

      <div className="card">
        <div className="list-header">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={16} /> Add
          </button>
        </div>

        {filteredData.length > 0 ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Reason</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.participants?.name || "Unknown"}</td>
                    <td>{entry.participants?.email || "N/A"}</td>
                    <td><span className="badge badge-warning">{entry.reason}</span></td>
                    <td>{new Date(entry.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemove(entry.participant_id)}
                        title="Remove from blocklist"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No blocklisted participants</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Blocklist;
