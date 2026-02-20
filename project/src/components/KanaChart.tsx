import { KanaCard } from './KanaCard';
import { kanaData, rowNames } from '../data/kanaData';
import { useI18n } from '../hooks/useI18n';

interface KanaChartProps {
  showType: 'hiragana' | 'katakana';
}

export function KanaChart({ showType }: KanaChartProps) {
  const { t } = useI18n();
  const getKanaByRow = (rowName: string) => {
    return kanaData.filter(k => k.rowName === rowName).sort((a, b) => a.position - b.position);
  };

  const isYaRow = (rowName: string) => {
    return rowName === 'ya' || rowName.endsWith('ya');
  };

  const createPositionArray = (rowKana: typeof kanaData, isYa: boolean) => {
    if (!isYa) {
      return rowKana;
    }

    const arr = new Array(5).fill(null);
    rowKana.forEach(kana => {
      arr[kana.position - 1] = kana;
    });
    return arr;
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="space-y-6">
        {rowNames.map(rowName => {
          const rowKana = getKanaByRow(rowName);
          const yaRow = isYaRow(rowName);
          const displayArray = createPositionArray(rowKana, yaRow);

          const getRowTitle = (name: string) => {
            if (name === 'n') return t('chart_row_n');
            if (name === 'other') return t('chart_row_other');
            if (name.endsWith('ya') && name !== 'ya') {
              return `${t('chart_row_yoon')}: ${name.toUpperCase()}`;
            }
            return `${name.toUpperCase()} ${t('chart_row')}`;
          };

          return (
            <div key={rowName}>
              <h3 className="text-lg font-semibold text-gray-700 mb-3 uppercase">
                {getRowTitle(rowName)}
              </h3>
              <div className={yaRow ? "flex gap-4 justify-start" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4"}>
                {yaRow ? (
                  <>
                    {displayArray[0] && <KanaCard key={displayArray[0].id} kana={displayArray[0]} showType={showType} />}
                    <div className="w-16"></div>
                    {displayArray[2] && <KanaCard key={displayArray[2].id} kana={displayArray[2]} showType={showType} />}
                    <div className="w-16"></div>
                    {displayArray[4] && <KanaCard key={displayArray[4].id} kana={displayArray[4]} showType={showType} />}
                  </>
                ) : (
                  displayArray.map(kana => (
                    kana ? <KanaCard key={kana.id} kana={kana} showType={showType} /> : null
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
