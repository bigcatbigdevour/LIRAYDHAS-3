declare module 'tz-lookup' {
  /** Given (lat, lon), return an IANA timezone string. Throws on invalid input. */
  function tzlookup(lat: number, lon: number): string;
  export default tzlookup;
}
