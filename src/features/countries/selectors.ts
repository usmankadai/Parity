import type { RootState } from '../../app/store';

export const selectCountries = (state: RootState) => state.countries.items;
export const selectCountriesStatus = (state: RootState) => state.countries.status;
export const selectCountriesError = (state: RootState) => state.countries.error;
export const selectCountriesRetry = (state: RootState) => state.countries.retry;
