"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import ContentRow from "@/components/ContentRow";
import { Skeleton } from "@/components/ui/skeleton";
import { tmdbApi, MediaItem } from "@/services/tmdbApi";

type OscarNomination = {
  category: string;
  year: string;
  nominees?: string[];
  movies: Array<{ title: string; tmdb_id?: number | null; imdb_id?: string | null }>;
  won?: boolean | null;
};

type OscarMovieRef = {
  title: string;
  tmdbId?: number | null;
  imdbId?: string | null;
};

type OscarCategoryView = {
  name: string;
  nominees: OscarMovieRef[];
  winners: OscarMovieRef[];
};

const OSCAR_DATA_URL = "https://raw.githubusercontent.com/delventhalz/json-nominations/master/oscar-nominations.json";
const WIKI_PAGES_BY_YEAR: Record<number, string> = {
  2024: "96th_Academy_Awards",
  2025: "97th_Academy_Awards",
  2026: "98th_Academy_Awards"
};

const parseWikiCategories = (html: string): OscarCategoryView[] => {
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  const invalidHeaders = new Set(["Nominee", "Nominees", "Film", "Films", "Category", "Award", "Recipient", "Recipients"]);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const results = new Map<string, { nominees: Map<string, OscarMovieRef>; winners: Map<string, OscarMovieRef> }>();

  const addNominee = (category: string, title: string, isWinner: boolean) => {
    const key = `title:${title.toLowerCase()}`;
    const entry =
      results.get(category) || {
        nominees: new Map<string, OscarMovieRef>(),
        winners: new Map<string, OscarMovieRef>()
      };
    const ref = { title };
    entry.nominees.set(key, ref);
    if (isWinner) {
      entry.winners.set(key, ref);
    }
    results.set(category, entry);
  };

  const extractCategoryFromCell = (cell: Element) => {
    const candidate = Array.from(cell.querySelectorAll("b, strong")).find((node) => !node.closest("li") && node.closest("div"));
    return candidate ? normalize(candidate.textContent || "") : "";
  };

  const extractTitles = (cell: Element) =>
    Array.from(cell.querySelectorAll("i"))
      .map((node) => ({
        title: normalize(node.textContent || ""),
        isWinner: Boolean(node.closest("b, strong"))
      }))
      .filter((item) => Boolean(item.title));

  const allTables = Array.from(doc.querySelectorAll("table.wikitable"));
  const winnersAnchor = doc.querySelector("#Winners_and_nominees");
  const sectionRoot = winnersAnchor?.closest("h2") ?? winnersAnchor?.parentElement ?? null;
  const tablesToParse =
    sectionRoot !== null
      ? (() => {
          const collected: Element[] = [];
          let current = sectionRoot.nextElementSibling;
          while (current) {
            if (current.tagName.toLowerCase() === "h2") break;
            if (current.matches("table.wikitable")) {
              collected.push(current);
            } else {
              collected.push(...Array.from(current.querySelectorAll("table.wikitable")));
            }
            current = current.nextElementSibling;
          }
          return collected.length > 0 ? collected : allTables;
        })()
      : allTables;

  tablesToParse.forEach((table) => {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (rows.length === 0) return;

    let parsedCategoryBlocks = false;
    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll("td, th"));
      cells.forEach((cell) => {
        const categoryName = extractCategoryFromCell(cell);
        if (!categoryName || invalidHeaders.has(categoryName)) return;
        parsedCategoryBlocks = true;
        const titles = extractTitles(cell);
        titles.forEach(({ title, isWinner }) => addNominee(categoryName, title, isWinner));
      });
    });
    if (parsedCategoryBlocks) return;

    const headerCells = Array.from(rows[0].querySelectorAll("th"));
    const headerNames = headerCells
      .map((cell) => normalize(cell.textContent || ""))
      .filter((name) => name && !invalidHeaders.has(name));

    rows.slice(1).forEach((row) => {
      const rowHeader = row.querySelector("th");
      const rowCells = Array.from(row.querySelectorAll("td"));
      const rowHeaderText = rowHeader ? normalize(rowHeader.textContent || "") : "";
      if (rowHeaderText && !invalidHeaders.has(rowHeaderText) && rowCells.length > 0) {
        const titles = extractTitles(rowCells[0]);
        titles.forEach(({ title, isWinner }) => addNominee(rowHeaderText, title, isWinner));
        return;
      }

      if (headerNames.length === 0) return;
      headerNames.forEach((category, index) => {
        const cell = rowCells[index];
        if (!cell) return;
        const titles = extractTitles(cell);
        if (titles.length === 0) return;
        titles.forEach(({ title, isWinner }) => addNominee(category, title, isWinner));
      });
    });
  });

  return Array.from(results.entries())
    .map(([name, data]) => ({
      name,
      nominees: Array.from(data.nominees.values()),
      winners: Array.from(data.winners.values())
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const Oscar = () => {
  const currentYear = new Date().getFullYear();
  const minYear = 1980;
  const availableYears = useMemo(
    () => Array.from({ length: currentYear - minYear + 1 }, (_, index) => currentYear - index),
    [currentYear, minYear]
  );
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [nominations, setNominations] = useState<OscarNomination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryItems, setCategoryItems] = useState<Record<string, MediaItem[]>>({});
  const [wikiCategoriesByYear, setWikiCategoriesByYear] = useState<Record<number, OscarCategoryView[]>>({});

  useEffect(() => {
    let isActive = true;
    const loadNominations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(OSCAR_DATA_URL);
        if (!response.ok) {
          throw new Error("Request failed");
        }
        const data = await response.json();
        if (isActive) {
          setNominations(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isActive) {
          setError("Impossibile caricare i titoli degli Oscar.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadNominations();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const wikiPage = WIKI_PAGES_BY_YEAR[selectedYear];
    if (!wikiPage || wikiCategoriesByYear[selectedYear]) return;
    let isActive = true;
    const loadWiki = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/html/${wikiPage}`);
        if (!response.ok) {
          throw new Error("Request failed");
        }
        const html = await response.text();
        const categories = parseWikiCategories(html);
        if (isActive) {
          setWikiCategoriesByYear((prev) => ({ ...prev, [selectedYear]: categories }));
        }
      } catch {
        if (isActive) {
          setError("Impossibile caricare i titoli degli Oscar.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadWiki();
    return () => {
      isActive = false;
    };
  }, [selectedYear, wikiCategoriesByYear]);

  const oscarYearView = useMemo(() => {
    const parsedYears = nominations
      .map((item) => Number.parseInt(item.year, 10))
      .filter((year) => Number.isFinite(year));
    const availableDataYears = Array.from(new Set(parsedYears)).sort((a, b) => b - a);
    const dataYear = availableDataYears.find((year) => year <= selectedYear) ?? selectedYear;
    const targetYearKey = String(dataYear);
    const categoriesMap = new Map<string, { nominees: Map<string, OscarMovieRef>; winners: Map<string, OscarMovieRef> }>();

    nominations.forEach((nomination) => {
      if (nomination.year !== targetYearKey) return;
      const movies = nomination.movies || [];
      if (movies.length === 0) return;
      const entry =
        categoriesMap.get(nomination.category) || {
          nominees: new Map<string, OscarMovieRef>(),
          winners: new Map<string, OscarMovieRef>()
        };
      const getKey = (movie: OscarMovieRef) =>
        movie.tmdbId ? `tmdb:${movie.tmdbId}` : `title:${movie.title.toLowerCase()}`;
      movies.forEach((movie) => {
        if (!movie?.title) return;
        const ref: OscarMovieRef = {
          title: movie.title,
          tmdbId: movie.tmdb_id ?? null,
          imdbId: movie.imdb_id ?? null
        };
        const key = getKey(ref);
        entry.nominees.set(key, ref);
        if (nomination.won) {
          entry.winners.set(key, ref);
        }
      });
      categoriesMap.set(nomination.category, entry);
    });

    const categories = Array.from(categoriesMap.entries())
      .map(([name, data]) => ({
        name,
        nominees: Array.from(data.nominees.values()),
        winners: Array.from(data.winners.values())
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { dataYear, categories };
  }, [nominations, selectedYear]);

  const wikiCategories = wikiCategoriesByYear[selectedYear] || [];
  const categoriesForYear = wikiCategories.length > 0 ? wikiCategories : oscarYearView.categories;
  const effectiveYear = wikiCategories.length > 0 ? selectedYear : oscarYearView.dataYear;

  useEffect(() => {
    let isActive = true;
    const loadCategoryItems = async () => {
      if (categoriesForYear.length === 0) {
        if (isActive) {
          setCategoryItems({});
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      const getKey = (movie: OscarMovieRef) =>
        movie.tmdbId ? `tmdb:${movie.tmdbId}` : `title:${movie.title.toLowerCase()}`;
      const uniqueMovies = new Map<string, OscarMovieRef>();
      categoriesForYear.forEach((category) => {
        category.nominees.forEach((movie) => {
          uniqueMovies.set(getKey(movie), movie);
        });
      });

      try {
        const resolvedEntries = await Promise.all(
          Array.from(uniqueMovies.entries()).map(async ([key, movie]) => {
            if (movie.tmdbId) {
              const details = await tmdbApi.getMovieDetails(String(movie.tmdbId));
              const normalized: MediaItem = {
                ...details,
                media_type: "movie",
                genre_ids: details.genre_ids || details.genres?.map((genre) => genre.id) || []
              };
              return [key, normalized] as const;
            }
            const searchResults = await tmdbApi.search(movie.title);
            const movieResults = searchResults.movies || [];
            const exactMatch = movieResults.find(
              (item) => (item.title || "").toLowerCase() === movie.title.toLowerCase()
            );
            const resolved = exactMatch || movieResults[0] || null;
            return resolved ? ([key, { ...resolved, media_type: "movie" }] as const) : ([key, null] as const);
          })
        );

        if (!isActive) return;

        const resolvedMap = new Map<string, MediaItem | null>(resolvedEntries);
        const nextCategoryItems: Record<string, MediaItem[]> = {};
        categoriesForYear.forEach((category) => {
          const items = category.nominees
            .map((movie) => resolvedMap.get(getKey(movie)))
            .filter((item): item is MediaItem => Boolean(item));
          nextCategoryItems[category.name] = items;
        });

        setCategoryItems(nextCategoryItems);
      } catch {
        if (isActive) {
          setError("Impossibile caricare i titoli degli Oscar.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadCategoryItems();
    return () => {
      isActive = false;
    };
  }, [categoriesForYear]);

  const hasWinnersForYear = categoriesForYear.some((category) => category.winners.length > 0);
  const showWinners = effectiveYear < currentYear || hasWinnersForYear;
  const modeLabel = showWinners ? "Candidati e vincitori" : "Candidati";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Oscar" description="Esplora i candidati e i vincitori degli Oscar per anno e categoria." />
      <Navbar />

      <main className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Oscar</h1>
            <p className="text-muted-foreground">Seleziona un anno per vedere {modeLabel.toLowerCase()} per categoria.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Anno</span>
            </div>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="bg-secondary/30 border border-muted/30 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2, 3, 4].map((card) => (
                    <Skeleton key={card} className="w-[180px] h-[270px] rounded-md" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {categoriesForYear.length > 0 ? (
              categoriesForYear.map((category) => (
                <div key={category.name} className="border border-muted/30 rounded-lg p-4">
                  {showWinners && category.winners.length > 0 && (
                    <p className="text-sm text-accent mb-3">
                      Vincitore: {category.winners.map((winner) => winner.title).join(", ")}
                    </p>
                  )}
                  {(categoryItems[category.name] || []).length > 0 ? (
                    <ContentRow
                      title={category.name}
                      icon={<Trophy className="text-accent" />}
                      items={categoryItems[category.name] || []}
                      showBadges={true}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nessun titolo disponibile per questa categoria.
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="border border-muted/30 rounded-lg p-6 text-center text-muted-foreground">
                Nessun dato Oscar disponibile per questo anno.
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Oscar;
