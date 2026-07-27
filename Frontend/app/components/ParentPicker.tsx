import { CitizenSearch, type CitizenOption } from '~/components/CitizenSearch';

// A birth-certificate parent is EITHER a registered citizen OR manually-entered
// details (foreign / deceased / unregistered parents).
export type ParentValue =
    | { mode: 'existing'; citizen: CitizenOption | null }
    | {
          mode: 'manual';
          full_name_kh: string;
          full_name_en: string;
          gender: 'M' | 'F';
          nationality: string;
          date_of_birth: string;
          national_id_number: string;
      };

export const emptyParent: ParentValue = { mode: 'existing', citizen: null };

const emptyManual: Extract<ParentValue, { mode: 'manual' }> = {
    mode: 'manual',
    full_name_kh: '',
    full_name_en: '',
    gender: 'F',
    nationality: 'Cambodian',
    date_of_birth: '',
    national_id_number: '',
};

// Build the API payload for one parent, or null when nothing was entered.
export function parentPayload(v: ParentValue): Record<string, unknown> | null {
    if (v.mode === 'existing') {
        return v.citizen ? { citizen_id: v.citizen.id } : null;
    }
    if (!v.full_name_kh.trim()) return null;
    return {
        full_name_kh: v.full_name_kh.trim(),
        full_name_en: v.full_name_en.trim() || null,
        gender: v.gender,
        nationality: v.nationality.trim() || null,
        date_of_birth: v.date_of_birth || null,
        national_id_number: v.national_id_number.trim() || null,
    };
}

export function ParentPicker({
    value,
    onChange,
    required = false,
    todayStr,
}: {
    value: ParentValue;
    onChange: (v: ParentValue) => void;
    required?: boolean;
    todayStr: string;
}) {
    const tabClass = (active: boolean) =>
        `rounded-md px-3 py-1 text-xs font-bold transition ${
            active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`;

    return (
        <div className="space-y-2">
            <div className="flex gap-2" role="group" aria-label="Parent entry mode">
                <button
                    type="button"
                    aria-pressed={value.mode === 'existing'}
                    className={tabClass(value.mode === 'existing')}
                    onClick={() => onChange(emptyParent)}
                >
                    Registered citizen
                </button>
                <button
                    type="button"
                    aria-pressed={value.mode === 'manual'}
                    className={tabClass(value.mode === 'manual')}
                    onClick={() => onChange({ ...emptyManual })}
                >
                    Enter manually
                </button>
            </div>

            {value.mode === 'existing' ? (
                <CitizenSearch
                    placeholder="Search registered citizen"
                    selected={value.citizen}
                    onSelect={(c) => onChange({ mode: 'existing', citizen: c })}
                    ringClass="focus:ring-blue-400"
                />
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    <input
                        type="text"
                        required={required}
                        placeholder="Name (Khmer)"
                        aria-label="Parent name (Khmer)"
                        value={value.full_name_kh}
                        onChange={(e) => onChange({ ...value, full_name_kh: e.target.value })}
                        className="input-field font-khmer"
                    />
                    <input
                        type="text"
                        placeholder="Name (Latin)"
                        aria-label="Parent name (Latin)"
                        value={value.full_name_en}
                        onChange={(e) => onChange({ ...value, full_name_en: e.target.value })}
                        className="input-field"
                    />
                    <select
                        aria-label="Parent gender"
                        value={value.gender}
                        onChange={(e) => onChange({ ...value, gender: e.target.value as 'M' | 'F' })}
                        className="input-field"
                    >
                        <option value="F">Female</option>
                        <option value="M">Male</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Nationality"
                        aria-label="Parent nationality"
                        value={value.nationality}
                        onChange={(e) => onChange({ ...value, nationality: e.target.value })}
                        className="input-field"
                    />
                    <input
                        type="date"
                        max={todayStr}
                        aria-label="Parent date of birth"
                        value={value.date_of_birth}
                        onChange={(e) => onChange({ ...value, date_of_birth: e.target.value })}
                        className="input-field"
                    />
                    <input
                        type="text"
                        placeholder="National ID (optional)"
                        aria-label="Parent national ID"
                        value={value.national_id_number}
                        onChange={(e) => onChange({ ...value, national_id_number: e.target.value })}
                        className="input-field"
                    />
                </div>
            )}
        </div>
    );
}
