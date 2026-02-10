"use client";

export interface FilterOptions {
  search: string;
  sender: string | null;
  recipient: string | null;
}

interface MessageFilterProps {
  filter: FilterOptions;
  onFilterChange: (filter: FilterOptions) => void;
  availablePowers: string[];
}

export function MessageFilter({ filter, onFilterChange, availablePowers }: MessageFilterProps) {
  return (
    <div className="mb-3 space-y-2">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search messages..."
          value={filter.search}
          onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
          className="w-full bg-[#1a1a1a] border-2 border-[#3a3a3a] text-[#e0e0e0] px-3 py-2 text-xs placeholder-[#808080] focus:border-[#ff9500] focus:outline-none transition-colors"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#808080] text-xs">🔍</span>
      </div>

      {/* Sender/Recipient Filters */}
      <div className="flex gap-2">
        <select
          value={filter.sender || ""}
          onChange={(e) => onFilterChange({ ...filter, sender: e.target.value || null })}
          className="flex-1 bg-[#1a1a1a] border-2 border-[#3a3a3a] text-[#e0e0e0] px-2 py-1 text-xs focus:border-[#ff9500] focus:outline-none"
        >
          <option value="">From: All</option>
          {availablePowers.map(power => (
            <option key={power} value={power}>{power}</option>
          ))}
        </select>

        <select
          value={filter.recipient || ""}
          onChange={(e) => onFilterChange({ ...filter, recipient: e.target.value || null })}
          className="flex-1 bg-[#1a1a1a] border-2 border-[#3a3a3a] text-[#e0e0e0] px-2 py-1 text-xs focus:border-[#ff9500] focus:outline-none"
        >
          <option value="">To: All</option>
          {availablePowers.map(power => (
            <option key={power} value={power}>{power}</option>
          ))}
        </select>
      </div>

      {/* Clear Filter */}
      {(filter.search || filter.sender || filter.recipient) && (
        <button
          onClick={() => onFilterChange({ search: "", sender: null, recipient: null })}
          className="w-full py-1 text-[10px] text-[#ff9500] hover:text-[#ffaa20] transition-colors"
        >
          Clear Filters ✕
        </button>
      )}
    </div>
  );
}
