import { Card } from '@/components/ui/Card'

export const metadata = {
  title: 'Size Guide • ThePlug',
  description: 'Comprehensive size guide and conversions for clothing and shoes.',
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-gray-700">
        {children}
      </table>
    </div>
  )
}

export default function SizeGuidePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Size Guide</h1>
      <p className="text-gray-600 mb-8">
        Find your perfect fit with our measurement tips and size conversion charts. Measurements are approximate; if you are between sizes, we generally recommend sizing up.
      </p>

      <div className="space-y-10">
        {/* How to measure */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">How to Measure</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li><span className="font-medium">Chest/Bust:</span> Measure around the fullest part of your chest, keeping the tape parallel to the floor.</li>
            <li><span className="font-medium">Waist:</span> Measure around the narrowest part of your waistline.</li>
            <li><span className="font-medium">Hips:</span> Measure around the fullest part of your hips.</li>
            <li><span className="font-medium">Inseam:</span> Measure from the top of the inner thigh to the bottom of the ankle.</li>
            <li><span className="font-medium">Foot length (shoes):</span> Stand on paper, mark heel to longest toe, and measure the distance in cm.</li>
          </ul>
        </Card>

        {/* Tops (Unisex) */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Tops (Unisex)</h2>
          <Table>
            <thead>
              <tr className="text-gray-500">
                <th className="py-2 pr-6">Size</th>
                <th className="py-2 pr-6">Chest (cm)</th>
                <th className="py-2 pr-6">Chest (in)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { s: 'XS', ccm: '84-89', cin: '33-35' },
                { s: 'S',  ccm: '90-95', cin: '35-37' },
                { s: 'M',  ccm: '96-101', cin: '38-40' },
                { s: 'L',  ccm: '102-107', cin: '40-42' },
                { s: 'XL', ccm: '108-115', cin: '42.5-45' },
                { s: 'XXL',ccm: '116-123', cin: '45.5-48' },
              ].map(r => (
                <tr key={r.s} className="border-t">
                  <td className="py-2 pr-6 font-medium">{r.s}</td>
                  <td className="py-2 pr-6">{r.ccm}</td>
                  <td className="py-2 pr-6">{r.cin}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {/* Bottoms (Unisex) */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Bottoms (Unisex)</h2>
          <Table>
            <thead>
              <tr className="text-gray-500">
                <th className="py-2 pr-6">Size</th>
                <th className="py-2 pr-6">Waist (cm)</th>
                <th className="py-2 pr-6">Hips (cm)</th>
                <th className="py-2 pr-6">Waist (in)</th>
                <th className="py-2 pr-6">Hips (in)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { s: 'XS', wcm: '66-71', hcm: '84-89', win: '26-28', hin: '33-35' },
                { s: 'S',  wcm: '72-77', hcm: '90-95', win: '28-30', hin: '35-37' },
                { s: 'M',  wcm: '78-83', hcm: '96-101', win: '31-33', hin: '38-40' },
                { s: 'L',  wcm: '84-89', hcm: '102-107', win: '33-35', hin: '40-42' },
                { s: 'XL', wcm: '90-97', hcm: '108-115', win: '35-38', hin: '42.5-45' },
                { s: 'XXL',wcm: '98-105',hcm: '116-123', win: '38.5-41', hin: '45.5-48' },
              ].map(r => (
                <tr key={r.s} className="border-t">
                  <td className="py-2 pr-6 font-medium">{r.s}</td>
                  <td className="py-2 pr-6">{r.wcm}</td>
                  <td className="py-2 pr-6">{r.hcm}</td>
                  <td className="py-2 pr-6">{r.win}</td>
                  <td className="py-2 pr-6">{r.hin}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {/* Dresses (Women) */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Dresses (Women)</h2>
          <Table>
            <thead>
              <tr className="text-gray-500">
                <th className="py-2 pr-6">Size</th>
                <th className="py-2 pr-6">Bust (cm)</th>
                <th className="py-2 pr-6">Waist (cm)</th>
                <th className="py-2 pr-6">Hips (cm)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { s: 'XS', b: '80-84', w: '62-66', h: '86-90' },
                { s: 'S',  b: '85-89', w: '67-71', h: '91-95' },
                { s: 'M',  b: '90-94', w: '72-76', h: '96-100' },
                { s: 'L',  b: '95-100',w: '77-82', h: '101-106' },
                { s: 'XL', b: '101-106', w: '83-88', h: '107-112' },
              ].map(r => (
                <tr key={r.s} className="border-t">
                  <td className="py-2 pr-6 font-medium">{r.s}</td>
                  <td className="py-2 pr-6">{r.b}</td>
                  <td className="py-2 pr-6">{r.w}</td>
                  <td className="py-2 pr-6">{r.h}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {/* Shoes conversion */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Shoes (EU/US/UK) Conversion</h2>
          <Table>
            <thead>
              <tr className="text-gray-500">
                <th className="py-2 pr-6">EU</th>
                <th className="py-2 pr-6">US (M)</th>
                <th className="py-2 pr-6">US (W)</th>
                <th className="py-2 pr-6">UK</th>
                <th className="py-2 pr-6">Foot length (cm)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { eu: 35, usm: 3, usw: 4.5, uk: 2.5, cm: 22.4 },
                { eu: 36, usm: 4, usw: 5.5, uk: 3.5, cm: 23.0 },
                { eu: 37, usm: 5, usw: 6.5, uk: 4.5, cm: 23.7 },
                { eu: 38, usm: 6, usw: 7.5, uk: 5.5, cm: 24.3 },
                { eu: 39, usm: 7, usw: 8.5, uk: 6.5, cm: 25.0 },
                { eu: 40, usm: 7.5, usw: 9, uk: 7, cm: 25.7 },
                { eu: 41, usm: 8, usw: 9.5, uk: 7.5, cm: 26.3 },
                { eu: 42, usm: 9, usw: 10.5, uk: 8.5, cm: 27.0 },
                { eu: 43, usm: 10, usw: 11.5, uk: 9.5, cm: 27.7 },
                { eu: 44, usm: 11, usw: 12.5, uk: 10.5, cm: 28.3 },
                { eu: 45, usm: 12, usw: 13.5, uk: 11.5, cm: 29.0 },
              ].map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-6 font-medium">{r.eu}</td>
                  <td className="py-2 pr-6">{r.usm}</td>
                  <td className="py-2 pr-6">{r.usw}</td>
                  <td className="py-2 pr-6">{r.uk}</td>
                  <td className="py-2 pr-6">{r.cm}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {/* Tips */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Fit Tips</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>Between sizes? Consider sizing up for a more relaxed fit.</li>
            <li>Sneakers from different brands can vary slightly; check the product page for brand notes.</li>
            <li>Stretch fabrics may feel tighter initially and relax with wear.</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
