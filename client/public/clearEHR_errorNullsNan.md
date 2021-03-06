# Welcome to Wrattler
### This is an attempt to load an data file in R, manipulate it a bit, and output multiple (two, really) dataframes that will be used for some analysis in Python.

```r

library(purrr)
library(cleanEHR)
# full dataset



# full dataset
#load(paste(data_folder,"anon_public_d.RData",sep="/"))
#ccd <- anon_ccd

#dt1 <- ccd_demographic_table(anon_ccd, dtype=TRUE)

file <- paste(tempdir(), "/ccd.rdata", sep="")
download.file("https://github.com/ropensci/cleanEHR/raw/master/data/sample_ccd.RData", file)
load(file)


mean_tail_diff <- function(vector) {
  diff <- mean(vector,na.rm=TRUE) - tail(vector,n=1)
  return (diff)
}


dt <- ccd_demographic_table(ccd, dtype=TRUE)

# get the codes of time series variables
names_ts_variables <- c()
counter <- 1
for (i in 1:length(ccd@episodes)){
  for (n in names(ccd@episodes[[i]]@data)){
    if (length(ccd@episodes[[i]]@data[n][[1]]) == 2){ # guarantee time series
      names_ts_variables[[counter]] <- n
      counter <- counter+1
    }
  }
}
names_ts_variables <- sort(unique(names_ts_variables))
short_names_ts_variables <- lapply(names_ts_variables, FUN = code2stname)

# our index is NIHR_HIC_ICU_0005, corresponding to a unique (per episode/patient) admission number, or ADNO
index_variable <- "NIHR_HIC_ICU_0005"
# prepare lists of measurements from time series
ts_measures <- c("mean","std","last","mean_tail_diff")
ts_measures_funcs <- c(partial(mean,na.rm=TRUE),partial(sd),partial(tail,n=1),partial(mean_tail_diff))

names_for_dts <- c("ADNO")
for (sn in short_names_ts_variables){
  for (mes in ts_measures){
    names_for_dts <- append(names_for_dts,paste(sn,mes,sep = "_"))
  }
}
dts <- data.frame(matrix(NA, nrow=0, ncol=length(names_for_dts)))
names(dts) <- names_for_dts

## prepare TS dataset
for (i in 1:length(ccd@episodes)){
  adno <- as.numeric(ccd@episodes[[i]]@data[index_variable][[1]])
  measurements <- c(adno)
  for (n in names_ts_variables){
      # Add time limit of 10 hours to measure TS data!
      dts_episode <- ccd@episodes[[i]]@data[n][[1]]

      ## the following line broke wrattler (but runs in normal R), as alternative i used the subset function:
      #dts_episode_sub <- dts_episode[dts_episode$time < 10,]

      dts_episode_sub <- subset(dts_episode, dts_episode$time < 10)

      values <- dts_episode_sub["item2d"][[1]]
      
      
    if (!is_empty(values)){
      for (measure in ts_measures_funcs){
        
        measurements <- c(measurements,measure(as.numeric(values))[[1]])
      }
    } else {
      measurements <- c(measurements,rep(NA,length(ts_measures)))
    }
  }
  dts <- rbind(dts,measurements)
  names(dts) <- names_for_dts
}
```

```python
dtf = dt.merge(dts, left_on="ADNO", right_on="ADNO", how="inner")
```

```python
dtf0_headers = list(dtf.shape)
dtf = dtf[pd.notnull(dtf['DAICU'])&pd.notnull(dtf['DOD'])&pd.notnull(dtf['TOD'])] # columns needed for target (time to die)
dt = dt[pd.notnull(dt['DAICU'])&pd.notnull(dt['DOD'])&pd.notnull(dt['TOD'])] # columns needed for target (time to die)
 # columns needed for target (time to die)
```