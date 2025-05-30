
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { WordPair, SuffixedWord } from '../types';
import { euskaraWords } from '../data';
import { euskaraVerbs } from '../verbData';

const allWordsData: WordPair[] = [...euskaraWords, ...euskaraVerbs];
const OFFICIAL_SUFFIXES = ["kide", "tegi", "kor", "tasun", "keria"];

const extractSuffixedFormsFromBase = (base: string, wordList: WordPair[]): SuffixedWord[] => {
  if (!base.trim()) return [];

  const forms: SuffixedWord[] = [];
  const seenForms = new Set<string>();
  const lowerCaseBase = base.toLowerCase();

  wordList.forEach(item => {
    if (typeof item.basque === 'string' && item.basque.toLowerCase().startsWith(lowerCaseBase) && item.basque.length > base.length) {
      const potentialSuffix = item.basque.substring(base.length);
      if (potentialSuffix.trim().length > 0 && !item.basque[base.length -1]?.match(/\s|-/) && !potentialSuffix.startsWith(' ') && !potentialSuffix.startsWith('-') && !potentialSuffix.includes(' ')) {
        const fullBasqueForm = item.basque;
        if (!seenForms.has(fullBasqueForm.toLowerCase())) {
          forms.push({
            id: item.id.toString() + '-' + potentialSuffix, 
            base: base,
            suffix: potentialSuffix,
            fullBasque: fullBasqueForm,
            spanish: item.spanish,
          });
          seenForms.add(fullBasqueForm.toLowerCase());
        }
      }
    }
  });
  return forms.sort((a, b) => a.suffix.localeCompare(b.suffix));
};

const findWordsEndingWithSuffix = (targetSuffix: string, wordList: WordPair[]): SuffixedWord[] => {
  if (!targetSuffix.trim()) return [];
  const lowerCaseTargetSuffix = targetSuffix.toLowerCase();
  const forms: SuffixedWord[] = [];
   const seenForms = new Set<string>();

  wordList.forEach(item => {
    if (typeof item.basque === 'string' && item.basque.toLowerCase().endsWith(lowerCaseTargetSuffix)) {
      const basePart = item.basque.substring(0, item.basque.length - targetSuffix.length);
       if (!seenForms.has(item.basque.toLowerCase())) {
          forms.push({
            id: item.id.toString(),
            base: basePart, 
            suffix: targetSuffix, 
            fullBasque: item.basque,
            spanish: item.spanish,
          });
          seenForms.add(item.basque.toLowerCase());
       }
    }
  });
  // Sort by fullBasque for consistent grouping later
  return forms.sort((a, b) => a.fullBasque.localeCompare(b.fullBasque));
};


const WordSuffixGame: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [processedForms, setProcessedForms] = useState<SuffixedWord[]>([]);
  const [selectedForm, setSelectedForm] = useState<SuffixedWord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuffixSearch, setIsSuffixSearch] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
     if (value.trim() === '') {
      handleClearInput();
    }
  };

  const handleClearInput = () => {
    setInputValue('');
    setSearchTerm(null);
    setProcessedForms([]);
    setSelectedForm(null);
    setError(null);
    document.getElementById('searchInput')?.focus();
  };

  const handleSearchSubmit = useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    
    const currentSearchInput = inputValue.trim();
    if (!currentSearchInput) {
        handleClearInput();
        return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedForm(null);
    setSearchTerm(currentSearchInput);

    await new Promise(resolve => setTimeout(resolve, 50)); 

    try {
      let newForms: SuffixedWord[] = [];
      if (currentSearchInput.startsWith('*')) {
        setIsSuffixSearch(true);
        const targetSuffix = currentSearchInput.substring(1);
        if (OFFICIAL_SUFFIXES.includes(targetSuffix.toLowerCase())) {
          newForms = findWordsEndingWithSuffix(targetSuffix, allWordsData);
           if (newForms.length === 0) {
            setError(`Ez da '${targetSuffix}' atzizkiarekin amaitzen den hitzik aurkitu.`);
          }
        } else if (targetSuffix.trim() === '') {
          setError("Atzizkia zehaztu behar da '*' ondoren bilatzeko.");
        } else {
          setError(`"${targetSuffix}" ez da onartutako atzizki bat bilaketa honetarako. Erabili: ${OFFICIAL_SUFFIXES.join(', ')}.`);
        }
      } else {
        setIsSuffixSearch(false);
        newForms = extractSuffixedFormsFromBase(currentSearchInput, allWordsData);
        if (newForms.length === 0 && currentSearchInput) {
          setError(`Ez da '${currentSearchInput}' hitzarekin hasten den forma atzizkidunik aurkitu.`);
        }
      }
      setProcessedForms(newForms);
       if (newForms.length > 0) {
         setSelectedForm(newForms[0]);
       }
    } catch (e) {
      setError('Errorea gertatu da hitzak bilatzean.');
      setProcessedForms([]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, allWordsData]);
  
   useEffect(() => {
    if (!isLoading && !error && processedForms.length > 0) {
        if(!selectedForm || (searchTerm && selectedForm.base.toLowerCase() !== searchTerm.toLowerCase() && !isSuffixSearch) || (searchTerm && isSuffixSearch && selectedForm.suffix.toLowerCase() !== searchTerm.substring(1).toLowerCase())) {
             setSelectedForm(processedForms[0]);
        }
    } else if (!isLoading && processedForms.length === 0 && searchTerm && searchTerm.trim() !== '') {
        setSelectedForm(null);
    }
  }, [processedForms, isLoading, error, searchTerm, isSuffixSearch, selectedForm]);

  const handleSuffixClick = (form: SuffixedWord) => {
    setSelectedForm(form);
  };
  
  const formatSpanishMeaning = (spanish: string) => {
    if (!spanish) return <p className="text-hitzkale-medium-text">Esanahia ez dago eskuragarri.</p>;
    return spanish.split('//').map((part, index) => (
      <p key={index} className="mb-1">{part.trim()}</p>
    ));
  };

  return (
    <div className="space-y-6 w-full">
      <form onSubmit={handleSearchSubmit} id="searchForm" className="flex flex-col sm:flex-row gap-3 items-center p-4 bg-hitzkale-card-bg shadow-md rounded-lg">
        <div className="relative flex-grow w-full">
          <input
            id="searchInput"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Sartu euskal hitz bat (adib. 'egon') edo atzizkia (adib. '*-kide')"
            className="flex-grow p-3 pr-10 border border-hitzkale-border rounded-md focus:ring-2 focus:ring-hitzkale-primary focus:border-transparent outline-none text-lg w-full"
            aria-label="Bilatu beharreko hitza"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClearInput}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-hitzkale-medium-text hover:text-hitzkale-dark-text text-2xl font-bold"
              aria-label="Garbitu bilaketa"
            >
              &times;
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto bg-hitzkale-primary hover:bg-hitzkale-secondary text-white font-semibold py-3 px-6 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-hitzkale-accent disabled:opacity-50"
        >
          {isLoading ? 'Bilatzen...' : 'Bilatu'}
        </button>
      </form>

      {error && <p className="text-red-500 text-center p-2 bg-red-100 border border-red-500 rounded-md">{error}</p>}

      {searchTerm && !isLoading && !error && (
        <div className="flex flex-col md:flex-row gap-0 md:gap-1 bg-hitzkale-card-bg shadow-xl rounded-lg overflow-hidden">
          <div className="md:w-1/4 flex flex-col items-center md:items-start p-3 md:p-4 border-b-2 md:border-b-0 md:border-r-2 border-hitzkale-border bg-gray-50">
            <h2 className="text-3xl lg:text-4xl font-bold text-hitzkale-primary break-all text-center md:text-left w-full">
              {isSuffixSearch ? `Atzizkia: ${searchTerm}` : searchTerm}
            </h2>
          </div>

          <div className="md:w-1/3 flex-shrink-0 border-b-2 md:border-b-0 md:border-r-2 border-hitzkale-border flex flex-col">
             <h3 className="text-xl font-semibold text-hitzkale-secondary mb-2 p-3 md:p-4 pb-1 flex-shrink-0">
              {isSuffixSearch ? "Aurkitutako Hitzak:" : "Atzizkiak:"}
            </h3>
            <div className="p-3 md:p-4 pt-1 max-h-[200px] sm:max-h-[250px] md:max-h-[calc(350px_-_50px)] lg:max-h-[calc(400px_-_50px)] overflow-y-auto flex-grow">
              {processedForms.length > 0 ? (
                isSuffixSearch ? (
                  (() => {
                    const grouped: { [key: string]: SuffixedWord[] } = {};
                    processedForms.forEach(form => {
                      const firstLetter = form.fullBasque.charAt(0).toUpperCase();
                      if (!grouped[firstLetter]) {
                        grouped[firstLetter] = [];
                      }
                      grouped[firstLetter].push(form);
                    });

                    return Object.keys(grouped).sort((a,b) => a.localeCompare(b, 'eu')).map(letter => (
                      <div key={letter} className="mb-3">
                        <h4 className="text-lg font-semibold text-hitzkale-accent bg-hitzkale-light-bg p-1.5 rounded-t-md sticky top-0 z-5 pr-4">
                          {letter}
                        </h4>
                        <div className="space-y-1 pl-2 border-l-2 border-hitzkale-border ml-1">
                          {grouped[letter].map(form => (
                            <button
                              key={form.id}
                              onClick={() => handleSuffixClick(form)}
                              className={`w-full text-left p-2 rounded-md transition-colors duration-150 ease-in-out text-sm
                                ${selectedForm?.id === form.id
                                  ? 'bg-hitzkale-primary text-white shadow-sm'
                                  : 'hover:bg-hitzkale-accent hover:text-white text-hitzkale-dark-text'
                                } focus:outline-none focus:ring-1 focus:ring-hitzkale-accent`}
                              aria-pressed={selectedForm?.id === form.id}
                            >
                              {form.fullBasque}
                            </button>
                          ))}
                        </div>
                      </div>
                    ));
                  })()
                ) : (
                  <div className="space-y-1">
                    {processedForms.map((form) => (
                      <button
                        key={form.id}
                        onClick={() => handleSuffixClick(form)}
                        className={`w-full text-left p-2 rounded-md transition-colors duration-150 ease-in-out text-sm
                          ${selectedForm?.id === form.id
                            ? 'bg-hitzkale-primary text-white shadow-sm'
                            : 'bg-hitzkale-light-bg hover:bg-hitzkale-accent hover:text-white text-hitzkale-dark-text'
                          } focus:outline-none focus:ring-1 focus:ring-hitzkale-accent`}
                        aria-pressed={selectedForm?.id === form.id}
                      >
                        -{form.suffix} ({form.fullBasque})
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-hitzkale-medium-text text-sm">
                  {isSuffixSearch ? `Ez da atzizki honekin amaitzen den hitzik aurkitu.` : `Ez da hitz horrekin lotutako atzizkirik aurkitu.`}
                </p>
              )}
            </div>
          </div>
          
          <div className="md:w-5/12 flex flex-col min-h-[150px] md:min-h-0">
            <h3 className="text-xl font-semibold text-hitzkale-secondary mb-2 p-3 md:p-4 pb-1 flex-shrink-0">Esanahia:</h3>
            <div className="p-3 md:p-4 pt-1 flex-grow max-h-[200px] sm:max-h-[250px] md:max-h-[calc(350px_-_50px)] lg:max-h-[calc(400px_-_50px)] overflow-y-auto">
              {selectedForm ? (
                <div className="space-y-2">
                  <p className="text-xl font-bold text-hitzkale-primary">{selectedForm.fullBasque}</p>
                  <div className="text-base text-hitzkale-dark-text space-y-1">
                    {formatSpanishMeaning(selectedForm.spanish)}
                  </div>
                </div>
              ) : processedForms.length > 0 ? (
                  <p className="text-hitzkale-medium-text italic text-sm">Aukeratu forma bat bere esanahia ikusteko.</p>
              ) : (
                   <p className="text-hitzkale-medium-text italic text-sm">Ez dago esanahirik erakusteko.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {!searchTerm && !isLoading && (
        <p className="text-center text-hitzkale-medium-text text-lg mt-8 px-4">
          Sartu hitz bat goiko bilaketa-koadroan (adib. 'etxe') edo bilatu atzizki bidez (adib. '*-kide') eta sakatu "Bilatu".
        </p>
      )}
    </div>
  );
};

export default WordSuffixGame;