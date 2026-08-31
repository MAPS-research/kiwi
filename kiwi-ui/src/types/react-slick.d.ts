declare module 'react-slick' {
    import * as React from 'react';
  
    interface Settings {
      dots?: boolean;
      arrows?: boolean;
      autoplay?: boolean;
      infinite?: boolean;
      speed?: number;
      fade?: boolean;
      slidesToShow?: number;
      slidesToScroll?: number;
      autoplaySpeed?: number;
      [key: string]: any;
    }
  
    export default class Slider extends React.Component<Settings> {}
  }
  