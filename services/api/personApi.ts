
import { API_URL, fetchWithRetry } from "./config";

export interface PersonDetails {
    id: number;
    name: string;
    profile_path: string | null;
    birthday: string | null;
    deathday: string | null;
    place_of_birth: string | null;
    biography: string;
    known_for_department: string;
    gender: number;
}

export interface PersonCredit {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    media_type: "movie" | "tv";
    character: string;
    vote_average: number;
}

export const getPersonDetails = async (personId: number, language: string = "it-IT"): Promise<PersonDetails> => {
    try {
        const url = `${API_URL}/person/${personId}?language=${language}`;
        const response = await fetchWithRetry(url);

        if (!response.ok) {
            throw new Error("Errore nel caricamento dei dettagli dell'attore");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching person details:", error);
        throw error;
    }
};

export const getPersonCredits = async (personId: number, language: string = "it-IT"): Promise<{ cast: PersonCredit[] }> => {
    try {
        const url = `${API_URL}/person/${personId}/combined_credits?language=${language}`;
        const response = await fetchWithRetry(url);

        if (!response.ok) {
            throw new Error("Errore nel caricamento dei crediti");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching person credits:", error);
        throw error;
    }
};
