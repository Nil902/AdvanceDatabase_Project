import { useEffect, useState } from 'react';
import { api } from '~/lib/api';

// Cascading province → district → commune → village selector backed by the
// public /geo/* endpoints. Uncontrolled: it manages its own cascade state and
// reports the selected village_id (or null) via onChange. Remount (change `key`)
// to reset it.
interface GeoRow {
    id: number;
    name_en: string | null;
    name_kh: string | null;
}
interface GeoOption {
    value: string;
    label: string;
}

const toOption = (r: GeoRow): GeoOption => ({ value: String(r.id), label: r.name_en || r.name_kh || `#${r.id}` });

export function GeoSelect({
    onChange,
    ringClass = 'focus:ring-blue-400',
}: {
    onChange: (villageId: number | null) => void;
    ringClass?: string;
}) {
    const [province, setProvince] = useState('');
    const [district, setDistrict] = useState('');
    const [commune, setCommune] = useState('');
    const [village, setVillage] = useState('');

    const [provinces, setProvinces] = useState<GeoOption[]>([]);
    const [districts, setDistricts] = useState<GeoOption[]>([]);
    const [communes, setCommunes] = useState<GeoOption[]>([]);
    const [villages, setVillages] = useState<GeoOption[]>([]);

    useEffect(() => {
        api.get<GeoRow[]>('/geo/provinces')
            .then((rows) => setProvinces(rows.map(toOption)))
            .catch(() => setProvinces([]));
    }, []);

    useEffect(() => {
        if (!province) { setDistricts([]); return; }
        api.get<GeoRow[]>('/geo/districts', { province_id: province })
            .then((rows) => setDistricts(rows.map(toOption)))
            .catch(() => setDistricts([]));
    }, [province]);

    useEffect(() => {
        if (!district) { setCommunes([]); return; }
        api.get<GeoRow[]>('/geo/communes', { district_id: district })
            .then((rows) => setCommunes(rows.map(toOption)))
            .catch(() => setCommunes([]));
    }, [district]);

    useEffect(() => {
        if (!commune) { setVillages([]); return; }
        api.get<GeoRow[]>('/geo/villages', { commune_id: commune })
            .then((rows) => setVillages(rows.map(toOption)))
            .catch(() => setVillages([]));
    }, [commune]);

    const cls = `w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 ${ringClass}`;

    return (
        <div className="grid grid-cols-2 gap-2">
            <select
                aria-label="Province"
                value={province}
                onChange={(e) => { setProvince(e.target.value); setDistrict(''); setCommune(''); setVillage(''); onChange(null); }}
                className={cls}
            >
                <option value="">Province…</option>
                {provinces.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
                aria-label="District"
                value={district}
                disabled={!province}
                onChange={(e) => { setDistrict(e.target.value); setCommune(''); setVillage(''); onChange(null); }}
                className={cls}
            >
                <option value="">District…</option>
                {districts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
                aria-label="Commune"
                value={commune}
                disabled={!district}
                onChange={(e) => { setCommune(e.target.value); setVillage(''); onChange(null); }}
                className={cls}
            >
                <option value="">Commune…</option>
                {communes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
                aria-label="Village"
                value={village}
                disabled={!commune}
                onChange={(e) => { setVillage(e.target.value); onChange(e.target.value ? Number(e.target.value) : null); }}
                className={cls}
            >
                <option value="">Village…</option>
                {villages.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}
